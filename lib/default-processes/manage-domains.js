module.exports = {
  title: "Manage Domains",
  description: "Used by administrators to manage domains",
  uid: "MANAGE_DOMAINS",
  steps: [
    {
      stepType: "CLIENT",
      description: "Provides grid",
      mode: "VIEW",
      form: {
        elements: [
          {
            name: "grid",
            label: "Grid",
            elementType: "GRID",
            args: {
              source: "FETCH_DOMAINS",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  name: "Name"
                }
              }),
              extra: {
                editProcessor: "SAVE_DOMAIN",
                createProcessor: "SAVE_DOMAIN",
                createTemplate: [
                  {
                    name: "name",
                    elementType: "INPUT",
                    label: "Name",
                    description: null,
                    args: null,
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 1,
                    component_uid: "c285f696-a1c6-43ed-99ff-422d7fc48518"
                  },
                  {
                    name: "uid",
                    elementType: "INPUT",
                    label: "Unique ID",
                    description: null,
                    args: {
                      type: "text"
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 2,
                    component_uid: "8c7e6281-a946-4048-ba15-f6aeaa4da0b4"
                  },
                  {
                    name: "logo",
                    elementType: "FILEUPLOAD",
                    label: "Logo",
                    description: null,
                    args: {
                      showPreview: true,
                      fileType: "png|jpg|jpeg"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 3,
                    component_uid: "baf26c57-1442-46c1-9c58-71fd227cce2f"
                  },
                  {
                    name: "image",
                    elementType: "FILEUPLOAD",
                    label: "Image",
                    description: null,
                    args: {
                      fileType: "png|jpg|jpeg",
                      showPreview: true
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 4,
                    component_uid: "6133740e-659a-40ed-86d8-f977a8f3088d"
                  },
                  {
                    name: "config",
                    elementType: "LIST",
                    label: "Config",
                    description: null,
                    args: {
                      itemTemplate: [
                        {
                          name: "name",
                          elementType: "INPUT",
                          label: "Name",
                          description: null,
                          args: {
                            type: "text"
                          },
                          asyncValidators: [],
                          validators: [
                            {
                              validatorType: "REQUIRED"
                            }
                          ],
                          uid: null,
                          order: "-1",
                          component_uid: "3101ec7f-d212-454c-8805-1264269d95b8"
                        },
                        {
                          name: "value",
                          elementType: "INPUT",
                          label: "Value",
                          description: null,
                          args: {
                            type: "text"
                          },
                          asyncValidators: [],
                          validators: [
                            {
                              validatorType: "REQUIRED"
                            }
                          ],
                          uid: null,
                          order: null,
                          component_uid: "ff5148f4-fbf0-4f0b-9f89-ed1be47d6f4c"
                        }
                      ],
                      options: "TAG",
                      behavior: {
                        furmly_ref: "config"
                      }
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: "CHIP_LIST",
                    order: 5,
                    component_uid: "45e5cdb7-2e0e-4763-903a-5d6beb0c9ce6"
                  },
                  {
                    name: "public",
                    elementType: "LIST",
                    label: "Public",
                    description: null,
                    args: {
                      options: "REF",
                      behavior: {
                        template_ref: "config"
                      }
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: "CHIP_LIST",
                    order: 6,
                    component_uid: "4a45d6d8-0e22-48d9-9e02-4857219d0bfe"
                  },
                  {
                    name: "$password",
                    elementType: "INPUT",
                    label: "Admin Password",
                    description: "Admin password (logged in user).",
                    args: {
                      type: "password"
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 7,
                    component_uid: "3da2a4d3-be0f-47c7-8458-c29f8038a021"
                  }
                ]
              },
              mode: "CRUD",
              filter: [
                {
                  name: "name",
                  elementType: "INPUT",
                  label: "Name",
                  description: null,
                  args: null,
                  asyncValidators: [],
                  validators: [
                    {
                      validatorType: "REQUIRED"
                    }
                  ],
                  uid: null,
                  order: 1,
                  component_uid: "9809ba09-b0f1-40f0-b7d9-433e914bc81b"
                },
                {
                  name: "uid",
                  elementType: "INPUT",
                  label: "UID",
                  description: null,
                  args: {
                    type: "text"
                  },
                  asyncValidators: [],
                  validators: [],
                  uid: null,
                  order: 2,
                  component_uid: "48c2a08e-be46-48ce-98d0-06e09b17ed15"
                }
              ]
            },
            component_uid: "76e347f3-d2de-4d53-a12f-60bc88493a5f",
            order: null,
            validators: [],
            asyncValidators: []
          }
        ]
      },
      postprocessors: [],
      processors: [],
      __v: 0
    }
  ],
  requiresIdentity: true,
  __v: 0
};
