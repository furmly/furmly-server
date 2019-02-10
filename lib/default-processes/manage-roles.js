module.exports = {
  title: "Manage Roles",
  description: "Used by administrators to manage roles",
  uid: "MANAGE_ROLES",
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
              source: "FETCH_ROLES",
              templateConfig: JSON.stringify({
                name: "basic",
                config: {
                  name: "Name",
                  description: "Description"
                }
              }),
              extra: {
                fetchSingleItemProcessor: "FETCH_ROLE",
                editProcessor: "UPDATE_ROLE",
                createProcessor: "CREATE_ROLE",
                createTemplate: [
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
                    order: "1",
                    component_uid: "e45c8ed0-4f2a-4680-94e2-2935358a51ba"
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
                    order: "2",
                    component_uid: "bcbb3442-0e71-4ec2-8d90-855e868d5bef"
                  },
                  {
                    name: "claims",
                    elementType: "LIST",
                    label: "Claims",
                    description: "Permissions a user with this role can have.",
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
                          component_uid: "ca30c46b-43bf-4ab1-9a5a-7fb25d001e52"
                        }
                      ]
                    },
                    asyncValidators: [],
                    validators: [
                      {
                        validatorType: "REQUIRED"
                      },
                      {
                        validatorType: "MINLENGTH",
                        args: {
                          min: "1"
                        }
                      }
                    ],
                    uid: "CHIP_LIST",
                    order: "3",
                    component_uid: "30d3f664-be05-4320-ac73-2ebe6e6f4cfb"
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
                  component_uid: "60ca8906-ac7b-4a1f-b3db-4b20ca31895e"
                }
              ]
            },
            description: "",
            component_uid: "a7e0bc0b-c433-4ed1-bc92-1d8e32142e38",
            uid: "",
            order: 1,
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
