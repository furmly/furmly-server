module.exports = {
  title: "Manage Claims",
  description: "Manage Claims",
  uid: "MANAGE_CLAIMS",
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
              source: "FETCH_CLAIMS",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  type: "Type",
                  description: "Description"
                }
              }),
              filter: [
                {
                  name: "description",
                  elementType: "INPUT",
                  label: "Description",
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
                createProcessor: "SAVE_CLAIM",
                editProcessor: "SAVE_CLAIM",
                fetchSingleItemProcessor:"FETCH_CLAIM",
                createTemplate: [
                  {
                    name: "type",
                    elementType: "SELECTSET",
                    label: "Type",
                    description: null,
                    args: {
                      path: "value",
                      items: [
                        {
                          id: "http://www.furmly.com/processor",
                          displayLabel: "Processor",
                          elements: [
                            {
                              name: "_id",
                              elementType: "SELECT",
                              label: "Processor",
                              description: null,
                              args: {
                                type: "PROCESSOR",
                                config: {
                                  value: "LIST_PROCESSORS"
                                }
                              },
                              asyncValidators: [],
                              validators: [
                                {
                                  validatorType: "REQUIRED"
                                }
                              ],
                              uid: null,
                              order: "",
                              component_uid:
                                "51723d55-3b25-40cc-aa8a-d57bb4d31dd4"
                            }
                          ]
                        },
                        {
                          id: "http://www.furmly.com/process",
                          displayLabel: "Process",
                          elements: [
                            {
                              name: "_id",
                              elementType: "SELECT",
                              label: "Process",
                              description: null,
                              args: {
                                type: "PROCESSOR",
                                config: {
                                  value: "LIST_PROCESSES"
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
                                "868ec554-c9a4-40c7-9408-204749d3f332"
                            }
                          ]
                        }
                      ]
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      }
                    ],
                    uid: null,
                    order: 1,
                    component_uid: "97c1217b-17c0-440c-aaa5-3d0f0e7ccbbe"
                  },
                  {
                    name: "description",
                    elementType: "INPUT",
                    label: "Description",
                    description: null,
                    args: {
                      type: "text"
                    },
                    asyncValidators: [],
                    validators: [],
                    uid: null,
                    order: 2,
                    component_uid: "a7d0255a-52c8-42b3-8f06-6114b114f2bc"
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
                    component_uid: "3da2a4d3-be0f-47c7-8458-c29f8038a021"
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
