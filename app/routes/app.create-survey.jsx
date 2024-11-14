import {
    Box,
    Card,
    Layout,
    Link,
    List,
    Page,
    Text,
    BlockStack,
    FormLayout,
    TextField,
    DatePicker,
    Button,
    Thumbnail,
    Form,
  } from "@shopify/polaris";
  import { TitleBar } from "@shopify/app-bridge-react";
import { DatePickerComponent } from "../components/datePicker";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { json, useFetcher } from "@remix-run/react";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};
export const action = async({request}) => {
  const body = await request.formData();

  const title = body.get("title");
  const description = body.get("description");
  const startDate = new Date(body.get("startDate"));
  const endDate = new Date(body.get("endDate"));
  const options = JSON.parse(body.get("options"));
  // Create the survey in the database
  const survey = await prisma.survey.create({
    data: {
      title,
      description,
      startDate,
      endDate,
      options: {
        create: options.map(option => ({
          text: option.text,
          images: {
            create: option.images.map(url => ({
              url,
            })),
          },
        })),
      },
    },
  });

  
  console.log('Survey created:', survey);

  return json({ survey });
}

export default function CreateSurvey() {
  const [options, setOptions] = useState([{ text: "", images: [] }]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetcher = useFetcher();

  const handleSubmit = async(e) => {
    e.preventDefault();
    // Upload the images to Shopify CDN
    const updatedOptions = await Promise.all(options.map(async (option) => {
      const imageUrls = await Promise.all(option.images.map(async (image) => {
        const imageForm = new FormData();
        imageForm.append('file', image);
        const fileResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: imageForm,
        });
        const fileData = await fileResponse.json();
        console.log('File URL', fileData.uploadFileUrl);
        return fileData.uploadFileUrl;
      }));
      return {
        ...option,
        images: imageUrls,
      };
    }));

    console.log('Updated Options with Image URLs', updatedOptions);

    const formData = new FormData();
    const startDate = new Date(e.target["start-date"].value);
    const endDate = new Date(e.target["end-date"].value);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("startDate", startDate.toISOString());
    formData.append("endDate", endDate.toISOString());

    // Add updated options to formData
    formData.append("options", JSON.stringify(updatedOptions));

    // Submit the form data
    fetcher.submit(formData, { method: "POST" });
  };

    const handleAddOption = () => {
      setOptions([...options, { text: "", images: [] }]);
    };
    
    const handleRemoveOption = (index) => {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    };
    
    const handleTextChange = (index, value) => {
      const newOptions = [...options];
      newOptions[index].text = value;
      setOptions(newOptions);
    };
    
    const handleImageChange = (index, event) => {
      const files = Array.from(event.target.files)
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
      console.log('NEW FILES', newFiles)
      const newOptions = [...options];
      newOptions[index].images = files;
      console.log('NEW OPTIONS', newOptions)
      setOptions(newOptions);
    };

   
    return (
      <Page>
        <TitleBar title="Create Survey" />
        <Layout>
          <Layout.Section>
            <Card>
              <Form onSubmit={handleSubmit} encType="multipart/form-data">

            <FormLayout>
                <TextField name="title" label="Title" value={title} onChange={(e) => setTitle(e)}/>
                <TextField name="description" label="Description" multiline={3} value={description} onChange={(e) => setDescription(e)}/>
                <DatePickerComponent name="start-date" label="Start Date" />
                <DatePickerComponent name="end-date" label="End Date" />

                {options.map((option, index) => (
                <Card key={index} sectioned>
                  <FormLayout>
                    <TextField
                      name={`option-${index}-text`}
                      label={`Option ${index + 1} Text`}
                      value={option.text}
                      onChange={(value) => handleTextChange(index, value)}
                    />
                    <input
                      name={`option-${index}-images`}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(event) => handleImageChange(index, event)}
                    />
                    <BlockStack>
                      {option.images.map((image, imgIndex) => (
                        <Thumbnail
                          key={imgIndex}
                          source={URL.createObjectURL(image)}
                          alt={`Option ${index + 1} Image ${imgIndex + 1}`}
                        />
                      ))}
                    </BlockStack>
                    <Button
                      destructive
                      onClick={() => handleRemoveOption(index)}
                    >
                      Remove Option
                    </Button>
                  </FormLayout>
                </Card>
              ))}
              <Button onClick={handleAddOption}>Add Option</Button>

                <Button submit variant="primary" fullWidth>Submit</Button>
                </FormLayout>


              </Form>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Resources
                </Text>
                <List>
                  <List.Item>
                    <Link
                      url="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
                      target="_blank"
                      removeUnderline
                    >
                      App nav best practices
                    </Link>
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  
  