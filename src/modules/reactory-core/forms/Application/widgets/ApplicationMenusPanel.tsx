'use strict';

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationMenusPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  applicationId?: string;
  mode?: 'view' | 'edit';
}

const ApplicationMenusPanel = (props: ApplicationMenusPanelProps) => {
  const { reactory, formData, applicationId, mode = 'view' } = props;

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState } = React;

  const {
    Card,
    CardContent,
    CardHeader,
    Box,
    Typography,
    Divider,
    Button,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Grid,
  } = Material.MaterialCore;

  const {
    Menu: MenuIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    ExpandMore: ExpandMoreIcon,
    DragIndicator: DragIcon,
    Link: LinkIcon,
  } = Material.MaterialIcons;

  const menus = formData?.menus || [];
  const totalMenus = formData?.totalMenus || menus.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentMenuIndex, setCurrentMenuIndex] = useState<number>(-1);

  const handleAddMenu = () => {
    setSelectedMenu({
      key: '',
      target: '',
      roles: [],
      items: []
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditMenu = (menu: any, index: number) => {
    setSelectedMenu({ ...menu });
    setCurrentMenuIndex(index);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (confirm('Are you sure you want to delete this menu?')) {
      try {
        // TODO: Implement delete mutation
        reactory.log('Delete menu:', menuId);
      } catch (error) {
        reactory.log('Error deleting menu:', error);
      }
    }
  };

  const handleSaveMenu = async () => {
    try {
      // TODO: Implement save/update mutation
      reactory.log(isEditing ? 'Update menu:' : 'Create menu:', selectedMenu);
      setDialogOpen(false);
      setSelectedMenu(null);
      setCurrentMenuIndex(-1);
    } catch (error) {
      reactory.log('Error saving menu:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedMenu(null);
    setCurrentMenuIndex(-1);
  };

  const handleFieldChange = (field: string, value: any) => {
    setSelectedMenu({ ...selectedMenu, [field]: value });
  };

  const handleAddMenuItem = () => {
    setSelectedItem({
      label: '',
      icon: '',
      route: '',
      roles: []
    });
    setItemDialogOpen(true);
  };

  const handleEditMenuItem = (item: any) => {
    setSelectedItem({ ...item });
    setItemDialogOpen(true);
  };

  const handleDeleteMenuItem = (itemIndex: number) => {
    const updatedItems = selectedMenu.items.filter((_: any, idx: number) => idx !== itemIndex);
    setSelectedMenu({ ...selectedMenu, items: updatedItems });
  };

  const handleSaveMenuItem = () => {
    if (selectedItem.id) {
      // Edit existing item
      const updatedItems = selectedMenu.items.map((item: any) =>
        item.id === selectedItem.id ? selectedItem : item
      );
      setSelectedMenu({ ...selectedMenu, items: updatedItems });
    } else {
      // Add new item
      const newItem = { ...selectedItem, id: `item_${Date.now()}` };
      setSelectedMenu({
        ...selectedMenu,
        items: [...(selectedMenu.items || []), newItem]
      });
    }
    setItemDialogOpen(false);
    setSelectedItem(null);
  };

  const handleItemDialogClose = () => {
    setItemDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          avatar={<MenuIcon />}
          title="Application Menus"
          subheader={`Total: ${totalMenus}`}
          action={
            mode === 'edit' && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={handleAddMenu}
              >
                Add Menu
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {menus.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {menus.map((menu: any, menuIndex: number) => (
                <Accordion key={menu.id || menu.key}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <MenuIcon />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">{menu.key}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Target: {menu.target} • {menu.items?.length || 0} items
                        </Typography>
                      </Box>
                      {mode === 'edit' && (
                        <Box onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditMenu(menu, menuIndex)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMenu(menu.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          Roles:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                          {menu.roles?.length > 0 ? (
                            menu.roles.map((role: string) => (
                              <Chip key={role} label={role} size="small" />
                            ))
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              No roles specified
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Menu Items
                      </Typography>
                      {menu.items?.length > 0 ? (
                        <List>
                          {menu.items.map((item: any, itemIndex: number) => (
                            <ListItem
                              key={item.id || itemIndex}
                              secondaryAction={
                                mode === 'edit' && (
                                  <Box>
                                    <IconButton size="small">
                                      <DragIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )
                              }
                            >
                              <ListItemIcon>
                                <LinkIcon />
                              </ListItemIcon>
                              <ListItemText
                                primary={item.label}
                                secondary={
                                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                                    <Typography variant="caption" fontFamily="monospace">
                                      {item.route}
                                    </Typography>
                                    {item.roles?.length > 0 && (
                                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        {item.roles.map((role: string) => (
                                          <Chip key={role} label={role} size="small" />
                                        ))}
                                      </Box>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No menu items
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No menus configured. Menus will be displayed here when available.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Menu Edit/Create Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Menu' : 'Add New Menu'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Menu Key"
              value={selectedMenu?.key || ''}
              onChange={(e) => handleFieldChange('key', e.target.value)}
              fullWidth
              helperText="Unique identifier for the menu"
            />
            <TextField
              label="Target"
              value={selectedMenu?.target || ''}
              onChange={(e) => handleFieldChange('target', e.target.value)}
              fullWidth
              helperText="Target location (e.g., header, sidebar, footer)"
            />
            <TextField
              label="Roles"
              value={selectedMenu?.roles?.join(', ') || ''}
              onChange={(e) => handleFieldChange('roles', e.target.value.split(',').map((r: string) => r.trim()))}
              fullWidth
              helperText="Comma-separated list of roles that can see this menu"
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Menu Items</Typography>
              <Button
                startIcon={<AddIcon />}
                size="small"
                onClick={handleAddMenuItem}
              >
                Add Item
              </Button>
            </Box>
            
            {selectedMenu?.items?.length > 0 ? (
              <Paper variant="outlined" sx={{ p: 1 }}>
                <List dense>
                  {selectedMenu.items.map((item: any, idx: number) => (
                    <ListItem
                      key={item.id || idx}
                      secondaryAction={
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleEditMenuItem(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMenuItem(idx)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={item.label}
                        secondary={item.route}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : (
              <Typography variant="caption" color="text.secondary">
                No items added yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveMenu} variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Menu Item Edit/Create Dialog */}
      <Dialog open={itemDialogOpen} onClose={handleItemDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem?.id ? 'Edit Menu Item' : 'Add Menu Item'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Label"
              value={selectedItem?.label || ''}
              onChange={(e) => setSelectedItem({ ...selectedItem, label: e.target.value })}
              fullWidth
            />
            <TextField
              label="Icon"
              value={selectedItem?.icon || ''}
              onChange={(e) => setSelectedItem({ ...selectedItem, icon: e.target.value })}
              fullWidth
              helperText="Material icon name (e.g., dashboard, settings)"
            />
            <TextField
              label="Route"
              value={selectedItem?.route || ''}
              onChange={(e) => setSelectedItem({ ...selectedItem, route: e.target.value })}
              fullWidth
              helperText="Route path (e.g., /dashboard, /settings)"
            />
            <TextField
              label="Roles"
              value={selectedItem?.roles?.join(', ') || ''}
              onChange={(e) => setSelectedItem({ ...selectedItem, roles: e.target.value.split(',').map((r: string) => r.trim()) })}
              fullWidth
              helperText="Comma-separated list of required roles"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleItemDialogClose}>Cancel</Button>
          <Button onClick={handleSaveMenuItem} variant="contained">
            {selectedItem?.id ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ComponentDefinition = {
  name: 'ApplicationMenusPanel',
  nameSpace: 'reactory',
  version: '1.0.0',
  component: ApplicationMenusPanel,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'menus', 'panel'],
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationMenusPanel,
    [''],
    ComponentDefinition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: ApplicationMenusPanel,
  });
}

