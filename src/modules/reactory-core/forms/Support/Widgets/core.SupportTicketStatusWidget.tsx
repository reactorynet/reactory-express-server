import Reactory from '@reactory/reactory-core';

interface StatusWidgetDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  DropDownMenu: Reactory.Client.Components.DropDownMenu,
  FullScreenModal: Reactory.Client.Components.FullScreenModal,
  SupportTicket: Reactory.Client.Components.SupportTicket,
  ReactoryForm: Reactory.Forms.IReactoryFormComponent,
  SupportTicketWorkflow: any,
  StatusBadge: any
};

interface StatusWidgetProps {
  reactory: Reactory.Client.IReactoryApi,
  form?: any,
  status: string,
  ticket: Reactory.Models.IReactorySupportTicket,
  useCase: string,
  style: any
}

interface StatusWidgetModalMenuProps extends
  Reactory.Client.Components.IDropDownMenuItem {
  modalSize: 'full' | 'small'
}

const StatusWidget = (props: StatusWidgetProps) => {

  const { reactory, form, status = 'new', useCase = 'grid', ticket, style = {} } = props;
  reactory.log('StatusWidget', { ticket }, 'info');

  const { React, Material, DropDownMenu, FullScreenModal, SupportTicket, ReactoryForm, SupportTicketWorkflow, StatusBadge } = reactory.getComponents<StatusWidgetDependencies>([
    "react.React",
    "material-ui.Material",
    "core.DropDownMenu",
    "core.FullScreenModal",
    "core.SupportTicket",
    "core.ReactoryForm",
    "core.SupportTicketWorkflow",
    "core.StatusBadge",
  ]);

  const { MaterialCore, MaterialStyles } = Material;
  const { Typography } = MaterialCore;
  const [modal, setModal] = React.useState<boolean>(false)
  const [modalState, setModalState] = React.useState<{
    open: boolean,
    action: string,
    modalSize: 'full' | 'small'
  }>({
    open: false,
    action: 'none',
    modalSize: 'full'
  });

  const [SupportTicketDeleteAction, setSupportTicketDeleteActionForm] = React.useState<Reactory.Forms.IReactoryForm>(null);

  React.useEffect(() => {
    // we load the form at runtime when we need it, not before
    // this form will check the input data and validate to check
    // if this user can delete the ticket.
    const formResult = reactory.form("core.SupportTicketDeleteAction@1.0.0", (form, error) => {
      if (!error) {
        // we are setting a IReactoryForm object to the state
        // we use this object to render the form
        setSupportTicketDeleteActionForm(form);
      } else {
        setSupportTicketDeleteActionForm(null);
      }
    }, { ticketId: ticket.id })

    if (formResult) {
      setSupportTicketDeleteActionForm(formResult);
    }
  }, [ticket.id])


  const onMenuSelect = (evt: React.SyntheticEvent, menu: StatusWidgetModalMenuProps) => {
    setModalState({
      open: true,
      action: menu.key,
      modalSize: menu.modalSize
    });
  };

  let menus: StatusWidgetModalMenuProps[] = [
    { id: 'open', icon: 'search', title: 'View', key: 'open', modalSize: 'full' },
    { id: 'comment', icon: 'comment', title: 'Comment', key: 'comment', modalSize: 'full' },
    { id: 'close', icon: 'close', title: 'Close', key: 'close', modalSize: 'small' },
    { id: 'delete', icon: 'delete', title: 'Delete', key: 'delete', modalSize: 'small' }
  ];

  let ModalContent: React.FC = () => <></>;
  if (modalState.open === true) {
    const onHandleDeleteSubmit = (values: any) => {
      reactory.log('values', values);
      SupportTicketWorkflow.deleteTicket({ tickets: [ticket] })
        .then(() => {
          setModalState({
            ...modalState,
            open: false
          });
        });
    };

    const contentMap: { [key: string]: React.FC } = {
      'open': () => <SupportTicket reference={ticket.reference} mode={'view'} />,
      'comment': () => <>Comment</>,
      'close': () => <>Close</>,
      'delete': () => <ReactoryForm formDef={SupportTicketDeleteAction} onSubmit={onHandleDeleteSubmit} />
    }

    ModalContent = contentMap[modalState.action];
  }

  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', ...style }}>
        {useCase === 'grid' && StatusBadge && (
          <StatusBadge 
            value={status}
            uiSchema={{
              'ui:options': {
                variant: 'filled',
                size: 'small',
                colorMap: {
                  'new': '#9c27b0',
                  'open': '#2196f3',
                  'in-progress': '#ff9800',
                  'pending': '#fbc02d',
                  'resolved': '#4caf50',
                  'closed': '#757575',
                  'on-hold': '#fbc02d'
                },
                iconMap: {
                  'new': 'fiber_new',
                  'open': 'folder_open',
                  'in-progress': 'pending',
                  'pending': 'schedule',
                  'resolved': 'check_circle',
                  'closed': 'check_circle_outline',
                  'on-hold': 'pause_circle'
                },
                labelFormat: '${value.toUpperCase()}'
              }
            }}
          />
        )}
        {useCase !== 'grid' && <Typography variant="body2">
          {status.toUpperCase()}
        </Typography>}
        <DropDownMenu menus={menus} onSelect={onMenuSelect} />
      </span>
      <FullScreenModal title={`Support ticket ${ticket.reference}`} open={modalState.open === true} onClose={() => setModalState({
        ...modalState,
        open: false,
      })}>
        <ModalContent />
      </FullScreenModal>
    </>
  );
};


const Definition: any = {
  name: 'SupportTicketStatusComponent',
  nameSpace: 'core',
  version: '1.0.0',
  component: StatusWidget,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(Definition.nameSpace,
    Definition.name,
    Definition.version,
    StatusWidget,
    ['Support Ticket'],
    Definition.roles,
    true,
    [],
    'widget');
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, component: StatusWidget });
}