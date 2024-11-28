import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack,
  EmptyState,
  InlineGrid,
  Button,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node"; // or cloudflare/deno
import { useLoaderData } from "@remix-run/react";
import prisma from "../db.server";
import {DeleteIcon, EditIcon} from '@shopify/polaris-icons';

export const loader = async() => {
  return json(await prisma.survey.findMany({
     include: {
      options: {
        include: {
          images: true,
          votes: true,
        },
      },
    },
  }));
}
export default function Dashboard() {
  const surveys = useLoaderData();
  const handleEdit = (surveyId) => {
    console.log('Edit survey:', surveyId);
    // Add your edit logic here
  };

  const handleDelete = (surveyId) => {
    console.log('Delete survey:', surveyId);
    // Add your delete logic here
  };
  return (
    <Page>
      <TitleBar title="Dashboard" />
      <Layout>
        <Layout.Section>
              {surveys.length > 0 ? (
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Surveys
              </Text>
                <BlockStack gap="200">
                  {surveys.map((survey) => (
                     <Card roundedAbove="sm" key={survey.id}>
                     <BlockStack gap="200">
                       <InlineGrid columns="1fr auto">
                         <Link monochrome url={`/app/survey-details?id=${survey.id}`}>
                           {survey.title}
                         </Link>
                       </InlineGrid>
                       <Text as="p" variant="bodyMd">
                         { survey.description }
                       </Text>
                     </BlockStack>
                   </Card>
                  ))}
                </BlockStack>
                  {/* <Card key={survey.id}>
                          <Text as="h2" variant="bodyXl">
                            { survey.title}
                          </Text>
                          <Text as="p" variant="bodyMd">
                            { survey.description }
                          </Text>
                          <Text as="p" variant="bodySm">
                            { survey.startDate } - { survey.endDate }
                          </Text>
                          <Text as="p" variant="bodySm">
                            Created on: { survey.createdAt }
                          </Text>

                          <List>
                            {survey.options.map((option) => (
                              <List.Item key={option.id}>
                                <Text>{option.text}</Text>
                                <List>
                                  {option.images.map((image) => (
                                    <List.Item key={image.id}>
                                      <img src={image.url} alt={option.text} style={{width: 100}} />
                                    </List.Item>
                                  ))}
                                </List>
                                <List>
                                <List.Item>
                                  <Text>Total Votes: {option.votes.length}</Text>
                                </List.Item>
                              </List>
                              </List.Item>
                            ))}
                          </List>
                  </Card> */}
            </BlockStack>
          </Card>
              ) : 
              (
                <Card sectioned>
                <EmptyState
                  heading="No surveys yet"
                  action={{content: 'Create Survey', url: '/app/create-survey'}}
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Create a Survey to start seeing the data.</p>
                </EmptyState>
              </Card>
              )}
        </Layout.Section>
       
      </Layout>
    </Page>
  );
}
