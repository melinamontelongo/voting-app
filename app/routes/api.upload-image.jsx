import { authenticate } from "../shopify.server";
import { unstable_parseMultipartFormData, unstable_createMemoryUploadHandler, json } from "@remix-run/node";

const prepareFiles = (files) => files.map((file) => ({
  filename: file.name,
  mimeType: file.type,
  resource: file.type?.includes('image') ? 'IMAGE' : 'FILE',
  fileSize: file.size.toString(),
  httpMethod: 'POST',
}));

const prepareFilesToCreate = (stagedTargets, files, contentType) => stagedTargets.map((stagedTarget, index) => {
  return {
    originalSource: stagedTarget.resourceUrl,
    contentType: files[index].type.includes('image') ? 'IMAGE' : 'FILE',
    filename: files[index].name,
  };
});

const uploadFile = async (files, graphql) => {
  const preparedFiles = prepareFiles(files);

  const result = await graphql(`
    mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets {
          resourceUrl
          url
          parameters {
            name
            value
          }
        }
        userErrors {
          field,
          message
        }
      }
    }
  `, { variables: { input: preparedFiles }});

  const response = await result.json();

  const promises = [];

  files.forEach((file, index) => {
    const url = response.data.stagedUploadsCreate.stagedTargets[index].url;
    const params = response.data.stagedUploadsCreate.stagedTargets[index].parameters;
    const formData = new FormData();

    params.forEach((param) => {
        formData.append(param.name, param.value)
    })
    formData.append('file', file);

    const promise = fetch(url, {
        method: 'POST',
        body: formData,
    });
    promises.push(promise);
  });

  await Promise.all(promises);

  const createFile = await graphql(`
      mutation fileCreate($files: [FileCreateInput!]!) {
        fileCreate(files: $files) {
          files {
            id,
            preview {
              image {
                 url
                }
              }
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        files: prepareFilesToCreate(response.data.stagedUploadsCreate.stagedTargets, files),
      }
  });
  const fileCreateResponse = await createFile.json();

  return {
      stagedTargets: response.data.stagedUploadsCreate.stagedTargets,
      uploadedFileId: fileCreateResponse.data.fileCreate.files[0].id,
      errors: response.data.stagedUploadsCreate.userErrors
  }
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 20_000_000,
  });
  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler
  );
  const files = formData.getAll('file');

  const result = await uploadFile(files, admin.graphql);
  console.log(result.uploadedFileId);

  const getImageQuery = (id) => `
    query {
      node(id: "${id}") {
        id
        ... on MediaImage {
          image {
            url
          }
        }
      }
    }
  `;

  let img_present = null;
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 1000; // 1 second

  while (img_present == null && attempts < maxAttempts) {
    const newFileData = await admin.graphql(getImageQuery(result.uploadedFileId));
    const newFileDataResponse = await newFileData.json();
    img_present = newFileDataResponse.data.node.image;

    if (img_present == null) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (img_present == null) {
    return json({ error: "Failed to retrieve image URL" }, { status: 500 });
  }

  console.log('NEW FILE DATA', img_present.url);

  return {
    data: result,
    uploadFileUrl: img_present.url,
  };
};