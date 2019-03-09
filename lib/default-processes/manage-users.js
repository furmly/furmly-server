module.exports = {
  title: "Manage Users",
  description: "This is used by the admins to manage users per domain.",
  uid: "MANAGE_USER",
  steps: [
    {
      stepType: "CLIENT",
      description:
        "This is step contains a grid for adding editing and deleting users.",
      mode: "VIEW",
      form: {
        elements: [
          {
            name: "grid",
            label: "Grid",
            elementType: "GRID",
            args: {
              source: "FETCH_USERS",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  username: "Username"
                }
              }),
              extra: {
                fetchSingleItemProcessor: "FETCH_USER",
                editProcessor: "UPDATE_USER",
                createProcessor: "REGISTER_USER",
                createTemplate: [
                  {
                    name: "username",
                    elementType: "INPUT",
                    label: "Username",
                    description:
                      "This is property uniquely identifies a user within the system.",
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
                    component_uid: "8d8b773a-5eea-45df-ae90-83adeaf6891d"
                  },
                  {
                    name: "password",
                    elementType: "INPUT",
                    label: "Password",
                    description: "Password user will use to login.",
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
                    order: 2,
                    component_uid: "0d0c7b06-4461-4968-a888-a35aeebcc675"
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
                    order: 3,
                    component_uid: "de4990ae-0e35-4910-be4a-ee5i0c61d745"
                  },
                  {
                    name: "roles",
                    elementType: "LIST",
                    label: "Roles",
                    description:
                      "These are the roles a user assumes within the system.",
                    args: {
                      itemTemplate: [
                        {
                          name: "_id",
                          elementType: "SELECT",
                          label: "Roles",
                          description: "Roles the user assumes",
                          args: {
                            type: "PROCESSOR",
                            config: {
                              value: "GET_ALL_ROLES"
                            },
                            mode: ""
                          },
                          asyncValidators: [],
                          validators: [
                            {
                              validatorType: "REQUIRED"
                            }
                          ],
                          uid: "",
                          order: 3,
                          component_uid: "872417d2-9cd0-4902-beb5-044c75791d9d"
                        }
                      ]
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: "CHIP_LIST",
                    order: 4,
                    component_uid: "69f24412-ea47-483b-9522-8923b75c1281"
                  },
                  {
                    name: "claims",
                    elementType: "LIST",
                    label: "Claims",
                    description:
                      "Specific claims assigned to particular users.",
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
                            },
                            mode: ""
                          },
                          asyncValidators: [],
                          validators: [
                            {
                              validatorType: "REQUIRED"
                            }
                          ],
                          uid: null,
                          order: null,
                          component_uid: "55472061-5769-4986-a1a5-156203110397"
                        }
                      ]
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: "CHIP_LIST",
                    order: 5,
                    component_uid: "b22e68a1-90c9-4b5a-b8d3-7952988b811a"
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
                    order: 6,
                    component_uid: "0d0c7b0q-0e61-4968-a888-a35aeabcc605"
                  }
                ]
              },
              mode: "CRUD",
              filter: [
                {
                  name: "username",
                  elementType: "INPUT",
                  label: "By Username",
                  description: null,
                  args: {
                    type: "text"
                  },
                  asyncValidators: [],
                  validators: [],
                  uid: null,
                  order: 1,
                  component_uid: "4345b04e-1282-4006-a306-c608fc26c870"
                }
              ]
            },
            description: "",
            component_uid: "06ce9869-4cb0-4cdb-887c-6ca0e71312f1",
            uid: "",
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
