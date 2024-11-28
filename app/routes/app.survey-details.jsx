

  import { json } from "@remix-run/node"; // or cloudflare/deno
  import { useActionData, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
  import prisma from "../db.server";
import { BlockStack, Button, Card, FormLayout, InlineGrid, Layout, List, Modal, Page, Text, TextField, Thumbnail } from "@shopify/polaris";
import {DeleteIcon, EditIcon} from '@shopify/polaris-icons';
import { useCallback, useRef, useState } from "react";

  export const loader = async({ request }) => {
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

  export const action = async ({request}) => {
    const body = await request.formData();
    const surveyId = body.get("surveyId");
    if(request.method === "DELETE") {

      const survey = await prisma.survey.delete({
        where: {
          id: surveyId,
        },
      });
      console.log('Survey deleted:', survey);
      return json({ survey, message: "Survey deleted successfully" });
    }
    if (request.method === "PUT") {
      const title = body.get("title");
      const description = body.get("description");
      const startDate = new Date(body.get("startDate"));
      const endDate = new Date(body.get("endDate"));
      const options = JSON.parse(body.get("options"));

      const survey = await prisma.survey.update({
        where: { id: surveyId },
        data: {
          title,
          description,
          startDate,
          endDate,
          options: {
            update: options.map(option => ({
              where: { id: option.id },
              data: {
                text: option.text,
                images: {
                  deleteMany: {},
                  create: option.images.map(image => ({
                    url: image.url ? image.url : image,
                  })),
                },
              },
            })),
          },
        },
      });
      console.log('Survey updated:', survey);
      return json({ survey, message: "Survey updated successfully!"  });
    }
  }

  export default function Dashboard() {
    const { survey } = useLoaderData();
    const fetcher = useFetcher();
    const deleteButtonRef = useRef(null);
    const editButtonRef = useRef(null);
    const [deleteModalActive, setDeleteModalActive] = useState(false);
    const [editModalActive, setEditModalActive] = useState(false);
    const [activeSurveyId, setActiveSurveyId] = useState(null);

    //Edit Survey
    const [title, setTitle] = useState(survey.title);
    const [description, setDescription] = useState(survey.description);
    const [startDate, setStartDate] = useState(new Date(survey.startDate).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date(survey.endDate).toISOString().split('T')[0]);
    const [options, setOptions] = useState(survey.options);
    
    const navigate = useNavigate();

    const handleDeleteOpen = (id) => {
      setActiveSurveyId(id);
      setDeleteModalActive(true);
    }
    const handleDeleteClose = () => {
      setActiveSurveyId(null);
      setDeleteModalActive(false);
    }
    
    const handleEditOpen = (id) => {
      setActiveSurveyId(id);
      setEditModalActive(true);
    } 
    const handleEditClose = () => {
      setActiveSurveyId(null);
      setEditModalActive(false);
    }
    const handleDelete = () => {
      const formData = new FormData();
      formData.append("surveyId", activeSurveyId);
      fetcher.submit(formData, {method: "DELETE"});
      fetcher.onSuccess = () => {
        window.location.href = "/app/dashboard/";
      }
    }

    const handleOptionTextChange = (index, value) => {
      const newOptions = [...options];
      newOptions[index].text = value;
      setOptions(newOptions);
    };
  
    const handleOptionImageChange = (index, event) => {
      const files = Array.from(event.target.files);
      const newFiles = files.map((file) => {
        const { name, type, size } = file;
        return {
          filename: name,
          mimeType: type,
          fileSize: size,
          httpMethod: "POST", // Assuming POST method for all uploads
          resource: "IMAGE", // Assuming the resource type is IMAGE
        };
      })
      const newOptions = [...options];
      newOptions[index].images = files;
      setOptions(newOptions);
    };
  
    const handleEdit = async (e) => {
      e.preventDefault();

      const updatedOptions = await Promise.all(options.map(async (option) => {
        console.log('OPTION', option)
        const imageUrls = await Promise.all(option.images.map(async (image) => {
          if(image.url) return image;
          const imageForm = new FormData();
          imageForm.append('file', image);
          console.log('FILE', image) 
          const fileResponse = await fetch('/api/upload-image', {
            method: 'POST',
            body: imageForm,
          });
          const fileData = await fileResponse.json();
          return fileData.uploadFileUrl;
        }));
        return {
          ...option,
          images: imageUrls,
        };
      }));

      const formData = new FormData();
      formData.append("surveyId", survey.id);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("options", JSON.stringify(updatedOptions));
      fetcher.submit(formData, { method: "PUT" });
      if (fetcher.data?.message === "Survey updated successfully!") {
        handleEditClose();
        shopify.toast.show(fetcher.data.message);
      }
    };

    if (fetcher.data?.message === "Survey deleted successfully") {
      navigate("/app/dashboard");
    }

    return (
        <Page backAction={{content: 'Dashboard', url: '/app/dashboard/'}}
          title={survey.title}
          secondaryActions={[{content: 'Edit', onAction: () => handleEditOpen(survey.id), icon: EditIcon, ref: editButtonRef },
            {content: 'Delete', onAction: () => handleDeleteOpen(survey.id), icon: DeleteIcon, ref: deleteButtonRef, destructive: true}
          ]}
        >
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

            </InlineGrid>
            </BlockStack>
            </Card>
          </Layout.Section>
          <Modal activator={deleteButtonRef} 
          open={deleteModalActive}
          onClose={handleDeleteClose}
          primaryAction={{
            content: 'Delete',
            onAction: handleDelete,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: handleDeleteClose,
            },
          ]}
          >
            <Modal.Section>
              <Text>Are you sure you want to delete this survey?</Text>
            </Modal.Section>

          </Modal>

          <Modal activator={editButtonRef} 
          open={editModalActive}
          onClose={handleEditClose}
          primaryAction={{
            content: 'Save',
            onAction: handleEdit,
          }}
          secondaryActions={[
            {
              content: 'Cancel',
              onAction: handleEditClose,
            },
          ]}
          >
            <Modal.Section>
            <FormLayout>
            <TextField
              label="Title"
              value={title}
              onChange={(value) => setTitle(value)}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(value) => setDescription(value)}
              multiline={3}
            />
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(value) => setStartDate(value)}
            />
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(value) => setEndDate(value)}
            />
              {options.map((option, index) => (
              <Card key={index} sectioned>
                <FormLayout>
                  <TextField
                    label={`Option ${index + 1} Text`}
                    value={option.text}
                    onChange={(value) => handleOptionTextChange(index, value)}
                  />
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(event) => handleOptionImageChange(index, event)}
                  />
                  <BlockStack>
                    {option.images.map((image, imgIndex) => (
                      
                      <Thumbnail
                        key={imgIndex}
                        source={image.url ? image.url : image}
                        alt={`Option ${index + 1} Image ${imgIndex + 1}`}
                      />
                    ))}
                  </BlockStack>
                </FormLayout>
              </Card>
            ))}
          </FormLayout>
            </Modal.Section>

          </Modal>
        </Layout>
      </Page>
    );
  }
  