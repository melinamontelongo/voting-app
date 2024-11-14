

  import { json } from "@remix-run/node"; // or cloudflare/deno
  import { useActionData, useLoaderData } from "@remix-run/react";
  import prisma from "../db.server";
import { BlockStack, Button, Card, InlineGrid, Layout, List, Page, Text } from "@shopify/polaris";
import {DeleteIcon, EditIcon} from '@shopify/polaris-icons';
  export const loader = async({ request }) => {
    console.log('Survey details action');
    console.log('Request:', request);
    const url = new URL(request.url);
    const surveyId = url.searchParams.get("id");
  
    if (!surveyId) {
      throw new Response("Survey ID not provided", { status: 400 });
    }
  
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        options: {
          include: {
            images: true,
            votes: true,
          },
        },
      },
    });
  
    if (!survey) {
      throw new Response("Survey not found", { status: 404 });
    }
  
    return json({ survey });
  }
  export default function Dashboard() {
    const { survey } = useLoaderData();
    return (
        <Page>
        <Layout>
          <Layout.Section>
            <Card>
            <BlockStack gap="200">
            <InlineGrid columns="1fr auto">
                <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                {survey.title}
              </Text>
              <Text as="p" variant="bodyMd">
                {survey.description}
              </Text>
              <Text as="p" variant="bodyMd">
                Start Date: {new Date(survey.startDate).toLocaleDateString()}
              </Text>
              <Text as="p" variant="bodyMd">
                End Date: {new Date(survey.endDate).toLocaleDateString()}
              </Text>
              <Text as="h3" variant="headingSm">
                Options
              </Text>
              <ul>
                {survey.options.map((option) => (
                  <li key={option.id}>
                    <Text>{option.text}</Text>
                    <List>
                        {option.images.map((image) => (
                        <List.Item key={image.id}>
                            <img src={image.url} alt={option.text} style={{width: 100}} />
                        </List.Item>
                        ))}
                    </List>
                    <Text>Total Votes: {option.votes.length}</Text>
                  </li>
                ))}
              </ul>
              </BlockStack>
              <InlineGrid columns="2" gap={"300"} >
                         <Button
                         /*   onClick={() => handleEdit(survey.id)} */
                           accessibilityLabel="Edit"
                           icon={EditIcon}
                         >
                           Edit
                         </Button>
                         <Button
                           /* onClick={() => handleDelete(survey.id)} */
                           accessibilityLabel="Delete"
                           icon={DeleteIcon}
                         >
                           Delete
                         </Button>
                         </InlineGrid>
            </InlineGrid>
            </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  