module.exports = {
  title: "Manage Clients",
  description: "Manage Clients",
  uid: "MANAGE_CLIENTS",
  steps: [
    {
      stepType: "CLIENT",
      mode: "VIEW",
      form: {
        elements: [
          {
            name: "grid",
            label: "Grid",
            elementType: "GRID",
            args: {
              source: "FETCH_CLIENTS",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  name: "Name",
                  _id: "Client ID"
                }
              }),
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
                  order: "",
                  component_uid: "456c3301-e22e-439d-b663-8e2c6f0f6ecb"
                }
              ],
              extra: {
                createProcessor: "SAVE_CLIENT",
                editProcessor: "SAVE_CLIENT",
                fetchSingleItemProcessor: "FETCH_CLIENT",
                createTemplate: [
                  {
                    name: "_id",
                    elementType: "INPUT",
                    label: "Client ID",
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
                    order: "",
                    component_uid: "2e238586-3ffd-4c44-bce5-4e59f51b551a"
                  },
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
                    order: "",
                    component_uid: "22fb543b-7236-4d16-8598-09317474aba6"
                  },
                  {
                    name: "clientSecret",
                    elementType: "INPUT",
                    label: "Client Secret",
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
                    order: "",
                    component_uid: "443e7eb1-7266-42e0-8d43-e007d26978ed"
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
                    order: 10,
                    component_uid: "8628c497-41bb-41dd-be37-cf7bab0c4073"
                  }
                ],
                editTemplate: [
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
                    order: "",
                    component_uid: "22fb543b-7236-4d16-8598-09317474aba6"
                  },
                  {
                    name: "clientSecret",
                    elementType: "INPUT",
                    label: "Client Secret",
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
                    order: "",
                    component_uid: "443e7eb1-7266-42e0-8d43-e007d26978ed"
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
                    order: 10,
                    component_uid: "8628c497-41bb-41dd-be37-cf7bab0c4073"
                  }
                ]
              },
              mode: "CRUD"
            },
            component_uid: "b995c643-a5ac-46ae-b276-55461e7931bd",
            order: null,
            validators: [],
            asyncValidators: []
          }
        ]
      },
      postprocessors: [],
      processors: []
    }
  ],
  requiresIdentity: true
};
