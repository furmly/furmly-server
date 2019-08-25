module.exports = {
  title: "Manage Menus",
  description: "Used by administrators to manage menus",
  uid: "MANAGE_MENU",
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
              source: "FETCH_MENUS",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  displayLabel: "Label",
                  category: "Category",
                  group: "Group"
                }
              }),
              extra: {
                fetchSingleItemProcessor: "FETCH_MENU",
                editProcessor: "SAVE_MENU",
                createProcessor: "SAVE_MENU",
                createTemplate: [
                  {
                    name: "displayLabel",
                    elementType: "INPUT",
                    label: "Display Label",
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
                    order: 1,
                    component_uid: "62054370-1bf0-4be1-bcca-bb9498cb510f"
                  },
                  {
                    name: "icon",
                    elementType: "INPUT",
                    label: "Icon",
                    description: null,
                    args: {
                      type: "text"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 2,
                    component_uid: "7a3a0f26-ef45-4d48-afa0-c449991e72f4"
                  },
                  {
                    name: "client",
                    elementType: "SELECT",
                    label: "Client",
                    description: "Clients that will see this menu item",
                    args: {
                      type: "PROCESSOR",
                      config: {
                        value: "GET_ALL_CLIENTS"
                      }
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 3,
                    component_uid: "8e3945e4-9230-488d-b786-a54f26c1bd00"
                  },
                  {
                    name: "type",
                    elementType: "SELECTSET",
                    label: "Type",
                    description: "This determines navigation by the clients.",
                    args: {
                      items: [
                        {
                          id: "CLIENT",
                          displayLabel: "Client",
                          elements: [
                            {
                              name: "_id",
                              elementType: "INPUT",
                              label: "Unique ID",
                              description: null,
                              args: null,
                              asyncValidators: [],
                              validators: [
                                {
                                  validatorType: "REQUIRED"
                                }
                              ],
                              uid: null,
                              order: null,
                              component_uid:
                                "bd134702-527d-4436-8e62-1137e6cf7bb8"
                            }
                          ]
                        },
                        {
                          id: "FURMLY",
                          displayLabel: "Furmly",
                          elements: [
                            {
                              name: "_id",
                              elementType: "SELECT",
                              label: "Process",
                              description: null,
                              args: {
                                type: "PROCESSOR",
                                config: {
                                  value: "GET_ALL_PROCESSES"
                                }
                              },
                              asyncValidators: [],
                              validators: [
                                {
                                  validatorType: "REQUIRED"
                                }
                              ],
                              uid: null,
                              order: null,
                              component_uid:
                                "0c2590af-6f3c-45fe-a88e-5585b8504abb"
                            }
                          ]
                        }
                      ],
                      path: "value"
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 4,
                    component_uid: "6397ae43-dd46-4f9e-9fc0-e0ae67cbf468"
                  },
                  {
                    name: "home",
                    elementType: "INPUT",
                    label: "is Home Page ?",
                    description: null,
                    args: {
                      type: "checkbox"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 5,
                    component_uid: "4a0e5281-51f6-4c77-8b1f-652a407f30a6"
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
                    validators: [],
                    uid: null,
                    order: 6,
                    component_uid: "d341a717-79df-4dcc-bb2c-c66130fc33e4"
                  },
                  {
                    name: "domain",
                    elementType: "SELECT",
                    label: "Domain",
                    description: null,
                    args: {
                      type: "PROCESSOR",
                      config: {
                        value: "GET_ALL_DOMAINS",
                        keyProperty: "_id"
                      }
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 7,
                    component_uid: "892bfee0-1856-4520-8226-047d65ad1bc3"
                  },
                  {
                    name: "group",
                    elementType: "INPUT",
                    label: "Menu Group",
                    description: null,
                    args: null,
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 8,
                    component_uid: "0321ae4b-3ab6-423b-818e-8eb96a69b8e1"
                  },
                  {
                    name: "activated",
                    elementType: "INPUT",
                    label: "Activated",
                    description: null,
                    args: {
                      type: "checkbox"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 9,
                    component_uid: "ffd255bb-6c35-4423-b73b-28535a817ca8"
                  },
                  {
                    name: "category",
                    elementType: "INPUT",
                    label: "Category",
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
                    order: 10,
                    component_uid: "943239b9-6b1b-4ef6-b6a7-ad4726f2bf92"
                  },
                  {
                    name: "params",
                    elementType: "INPUT",
                    label: "Params",
                    description: null,
                    args: {
                      type: "text"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 11,
                    component_uid: "e9970e2d-1638-4154-8d75-3873ff5ce18b"
                  },
                  {
                    name: "claims",
                    elementType: "LIST",
                    label: "Claims",
                    description: null,
                    args: {
                      itemTemplate: [
                        {
                          name: "_id",
                          elementType: "SELECT",
                          label: "Claim",
                          description: null,
                          args: {
                            type: "PROCESSOR",
                            config: {
                              value: "GET_ALL_CLAIMS"
                            }
                          },
                          asyncValidators: [],
                          validators: [
                            {
                              validatorType: "REQUIRED"
                            }
                          ],
                          uid: null,
                          order: null,
                          component_uid: "a73c60b4-3636-4469-988a-e057ca6fad11"
                        }
                      ]
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: "CHIP_LIST",
                    order: 12,
                    component_uid: "3cd9ffd9-631d-4d27-8f97-6d882766fbf8"
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
                    order: 13,
                    component_uid: "d3b5c7b5-f480-46b2-a3ab-23a251abc8b2"
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
                  args: {
                    type: "text"
                  },
                  asyncValidators: [],
                  validators: [],
                  uid: null,
                  order: null,
                  component_uid: "b4aadccf-4e27-4ff8-87a9-a75ee3ad3dc5"
                },
                {
                  name: "category",
                  elementType: "INPUT",
                  label: "Category",
                  description: null,
                  args: {
                    type: "text"
                  },
                  asyncValidators: [],
                  validators: [],
                  uid: null,
                  order: 2,
                  component_uid: "4ae3f342-34e1-4913-9ab6-7560ec45b847"
                }
              ]
            },
            description: "",
            component_uid: "a7703269-649e-4fe7-b662-39c1e6e3054e",
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
  requiresIdentity: true
};
