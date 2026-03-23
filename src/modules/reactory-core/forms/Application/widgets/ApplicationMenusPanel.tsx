'use strict';

// @ts-nocheck

interface IComponentsImport {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationMenusPanelProps {
  reactory: Reactory.Client.IReactoryApi;
  formData?: any;
  onChange?: (formData: any) => void;
  applicationId?: string;
  mode?: 'view' | 'edit';
  availableFeatureFlags?: { feature: string; enabled?: boolean }[];
}

const ApplicationMenusPanel = (props: ApplicationMenusPanelProps) => {
  const {
    reactory,
    formData,
    onChange,
    applicationId,
    mode = 'view',
    availableFeatureFlags = [],
  } = props;

  if (formData && formData.menus) {
    reactory.log('ApplicationMenusPanel received formData:', formData);
  }

  const isAdmin = reactory.hasRole(['ADMIN']);

  const { React, Material } = reactory.getComponents<IComponentsImport>([
    'react.React',
    'material-ui.Material',
  ]);

  const { useState, useCallback } = React;

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
    FormControl,
    InputLabel,
    Select,
    MenuItem: SelectMenuItem,
    OutlinedInput,
    Checkbox,
    Alert,
    Autocomplete,
    Switch,
    Tooltip,
    FormControlLabel,
  } = Material.MaterialCore;

  const {
    Menu: MenuIcon,
    Add: AddIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    ExpandMore: ExpandMoreIcon,
    DragIndicator: DragIcon,
    Link: LinkIcon,
    ToggleOn: ToggleOnIcon,
    ToggleOff: ToggleOffIcon,
    Flag: FlagIcon,
  } = Material.MaterialIcons;

  const menus = formData?.menus || [];
  const totalMenus = formData?.totalMenus || menus.length;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentMenuIndex, setCurrentMenuIndex] = useState<number>(-1);
  const [editItemIndex, setEditItemIndex] = useState<number>(-1);

  /**
   * Propagate changes back to the parent form via onChange.
   */
  const propagateChange = useCallback(
    (updatedMenus: any[]) => {
      if (typeof onChange === 'function') {
        onChange({
          ...formData,
          menus: updatedMenus,
          totalMenus: updatedMenus.length,
        });
      }
    },
    [onChange, formData],
  );

  /**
   * Get feature flag label options from availableFeatureFlags.
   */
  const featureFlagOptions: string[] = availableFeatureFlags
    .map((f: any) => f.feature)
    .filter(Boolean);

  /**
   * Toggle menu enabled/disabled state inline.
   */
  const handleToggleMenuEnabled = (menuIndex: number) => {
    const updated = menus.map((m: any, i: number) =>
      i === menuIndex ? { ...m, enabled: !m.enabled } : m,
    );
    propagateChange(updated);
  };

  /**
   * Toggle menu item enabled/disabled state inline.
   */
  const handleToggleItemEnabled = (menuIndex: number, itemIndex: number) => {
    const updated = menus.map((m: any, mi: number) => {
      if (mi !== menuIndex) return m;
      const updatedItems = m.items.map((item: any, ii: number) =>
        ii === itemIndex ? { ...item, enabled: !item.enabled } : item,
      );
      return { ...m, items: updatedItems };
    });
    propagateChange(updated);
  };

  const handleAddMenu = () => {
    setSelectedMenu({
      key: '',
      name: '',
      target: '',
      roles: [],
      featureFlags: [],
      enabled: true,
      items: [],
    });
    setCurrentMenuIndex(-1);
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEditMenu = (menu: any, index: number) => {
    setSelectedMenu({ ...menu, items: [...(menu.items || [])] });
    setCurrentMenuIndex(index);
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDeleteMenu = (menuIndex: number) => {
    const updated = menus.filter((_: any, i: number) => i !== menuIndex);
    propagateChange(updated);
  };

  const handleSaveMenu = () => {
    let updated: any[];
    if (isEditing && currentMenuIndex >= 0) {
      updated = menus.map((m: any, i: number) =>
        i === currentMenuIndex ? { ...selectedMenu } : m,
      );
    } else {
      updated = [...menus, { ...selectedMenu }];
    }
    propagateChange(updated);
    setDialogOpen(false);
    setSelectedMenu(null);
    setCurrentMenuIndex(-1);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedMenu(null);
    setCurrentMenuIndex(-1);
  };

  const handleFieldChange = (field: string, value: any) => {
    setSelectedMenu((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddMenuItem = () => {
    setSelectedItem({
      label: '',
      icon: '',
      route: '',
      roles: [],
      enabled: true,
      featureFlags: [],
    });
    setEditItemIndex(-1);
    setItemDialogOpen(true);
  };

  const handleEditMenuItem = (item: any, index: number) => {
    setSelectedItem({ ...item });
    setEditItemIndex(index);
    setItemDialogOpen(true);
  };

  const handleDeleteMenuItem = (itemIndex: number) => {
    const updatedItems = selectedMenu.items.filter(
      (_: any, idx: number) => idx !== itemIndex,
    );
    setSelectedMenu((prev: any) => ({ ...prev, items: updatedItems }));
  };

  const handleSaveMenuItem = () => {
    let updatedItems: any[];
    if (editItemIndex >= 0) {
      // Edit existing item
      updatedItems = selectedMenu.items.map((item: any, idx: number) =>
        idx === editItemIndex ? { ...selectedItem } : item,
      );
    } else {
      // Add new item
      const newItem = { ...selectedItem, id: `item_${Date.now()}` };
      updatedItems = [...(selectedMenu.items || []), newItem];
    }
    setSelectedMenu((prev: any) => ({ ...prev, items: updatedItems }));
    setItemDialogOpen(false);
    setSelectedItem(null);
    setEditItemIndex(-1);
  };

  const handleItemDialogClose = () => {
    setItemDialogOpen(false);
    setSelectedItem(null);
    setEditItemIndex(-1);
  };

  const MenuItemsList = ({ items, menuIndex, depth, isAdmin: admin, onToggleEnabled, components: C }: any) => (
    <C.List disablePadding sx={depth > 0 ? { pl: 3, borderLeft: '2px solid', borderColor: 'divider' } : {}}>
      {items.map((item: any, itemIndex: number) => (
        <React.Fragment key={item.id || itemIndex}>
          <C.ListItem
            divider
            sx={{
              opacity: item.enabled !== false ? 1 : 0.55,
              py: 1,
            }}
            secondaryAction={
              admin && (
                <C.Box>
                  <C.Tooltip
                    title={item.enabled !== false ? 'Disable item' : 'Enable item'}
                  >
                    <C.IconButton
                      size="small"
                      onClick={() => onToggleEnabled(menuIndex, itemIndex)}
                      color={item.enabled !== false ? 'success' : 'default'}
                    >
                      {item.enabled !== false ? (
                        <C.ToggleOnIcon fontSize="small" />
                      ) : (
                        <C.ToggleOffIcon fontSize="small" />
                      )}
                    </C.IconButton>
                  </C.Tooltip>
                </C.Box>
              )
            }
          >
            <C.ListItemIcon sx={{ minWidth: 36 }}>
              <C.LinkIcon fontSize="small" />
            </C.ListItemIcon>
            <C.ListItemText
              primary={
                <C.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <C.Typography variant="body2">
                    {item.label}
                  </C.Typography>
                  <C.Chip
                    label={item.enabled !== false ? 'On' : 'Off'}
                    size="small"
                    color={item.enabled !== false ? 'success' : 'error'}
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                  {item.items?.length > 0 && (
                    <C.Chip
                      label={`${item.items.length} sub-item${item.items.length !== 1 ? 's' : ''}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  )}
                </C.Box>
              }
              secondary={
                <C.Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <C.Typography variant="caption" fontFamily="monospace">
                    {item.route}
                  </C.Typography>
                  {item.featureFlags?.length > 0 && (
                    <C.Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {item.featureFlags.map((flag: string) => (
                        <C.Chip
                          key={flag}
                          icon={<C.FlagIcon sx={{ fontSize: 12 }} />}
                          label={flag}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      ))}
                    </C.Box>
                  )}
                  {item.roles?.length > 0 && (
                    <C.Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {item.roles.map((role: string) => (
                        <C.Chip
                          key={role}
                          label={role}
                          size="small"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      ))}
                    </C.Box>
                  )}
                </C.Box>
              }
            />
          </C.ListItem>
          {item.items?.length > 0 && (
            <MenuItemsList
              items={item.items}
              menuIndex={menuIndex}
              depth={depth + 1}
              isAdmin={admin}
              onToggleEnabled={onToggleEnabled}
              components={C}
            />
          )}
        </React.Fragment>
      ))}
    </C.List>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Card>
        <CardHeader
          avatar={<MenuIcon />}
          title="Application Menus"
          subheader={`${menus.length} menu${menus.length !== 1 ? 's' : ''}`}
          action={
            isAdmin && (
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="small"
                onClick={handleAddMenu}
              >
                Add Menu
              </Button>
            )
          }
        />
        <Divider />
        <CardContent>
          {!isAdmin && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Only administrators can edit menus and feature flag assignments.
            </Alert>
          )}
          {menus.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {menus.map((menu: any, menuIndex: number) => (
                <Accordion
                  key={menu.id || menu.key || menuIndex}
                  defaultExpanded={false}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                      }}
                    >
                      <MenuIcon />
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Typography variant="h6">{menu.name}</Typography>
                          <Chip
                            label={menu.enabled !== false ? 'Enabled' : 'Disabled'}
                            size="small"
                            color={menu.enabled !== false ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Target: {menu.target} &bull;{' '}
                          {menu.items?.length || 0} items
                        </Typography>
                        {menu.featureFlags?.length > 0 && (
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              mt: 0.5,
                              flexWrap: 'wrap',
                            }}
                          >
                            {menu.featureFlags.map((flag: string) => (
                              <Chip
                                key={flag}
                                icon={<FlagIcon sx={{ fontSize: 14 }} />}
                                label={flag}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      {isAdmin && (
                        <Box onClick={(e: any) => e.stopPropagation()}>
                          <Tooltip
                            title={
                              menu.enabled !== false
                                ? 'Disable menu'
                                : 'Enable menu'
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleToggleMenuEnabled(menuIndex)
                              }
                              color={
                                menu.enabled !== false ? 'success' : 'default'
                              }
                            >
                              {menu.enabled !== false ? (
                                <ToggleOnIcon />
                              ) : (
                                <ToggleOffIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit menu">
                            <IconButton
                              size="small"
                              onClick={() =>
                                handleEditMenu(menu, menuIndex)
                              }
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete menu">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteMenu(menuIndex)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 0.5,
                            mt: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          {menu.roles?.length > 0 ? (
                            menu.roles.map((role: string) => (
                              <Chip key={role} label={role} size="small" />
                            ))
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
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
                        <MenuItemsList
                          items={menu.items}
                          menuIndex={menuIndex}
                          depth={0}
                          isAdmin={isAdmin}
                          onToggleEnabled={handleToggleItemEnabled}
                          components={{
                            List, ListItem, ListItemIcon, ListItemText,
                            Box, Typography, Chip, IconButton, Tooltip,
                            LinkIcon, ToggleOnIcon, ToggleOffIcon, FlagIcon,
                          }}
                        />
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          No menu items
                        </Typography>
                      )}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No menus configured. Menus will be displayed here when available.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Menu Edit/Create Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditing ? 'Edit Menu' : 'Add New Menu'}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
          >
            <TextField
              label="Menu Name"
              value={selectedMenu?.name || ''}
              onChange={(e: any) => handleFieldChange('name', e.target.value)}
              fullWidth
              helperText="Display name for the menu"
            />
            <TextField
              label="Menu Key"
              value={selectedMenu?.key || ''}
              onChange={(e: any) => handleFieldChange('key', e.target.value)}
              fullWidth
              helperText="Unique identifier for the menu"
            />
            <TextField
              label="Target"
              value={selectedMenu?.target || ''}
              onChange={(e: any) =>
                handleFieldChange('target', e.target.value)
              }
              fullWidth
              helperText="Target location (e.g., header, sidebar, footer)"
            />
            <TextField
              label="Roles"
              value={selectedMenu?.roles?.join(', ') || ''}
              onChange={(e: any) =>
                handleFieldChange(
                  'roles',
                  e.target.value
                    .split(',')
                    .map((r: string) => r.trim())
                    .filter(Boolean),
                )
              }
              fullWidth
              helperText="Comma-separated list of roles that can see this menu"
            />
            <Autocomplete
              multiple
              options={featureFlagOptions}
              value={selectedMenu?.featureFlags || []}
              onChange={(_: any, newValue: string[]) =>
                handleFieldChange('featureFlags', newValue)
              }
              freeSolo
              renderTags={(value: string[], getTagProps: any) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    color="primary"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Feature Flags"
                  helperText="Select feature flags required for this menu"
                />
              )}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={selectedMenu?.enabled !== false}
                  onChange={(e: any) =>
                    handleFieldChange('enabled', e.target.checked)
                  }
                />
              }
              label="Enabled"
            />

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
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
                    <React.Fragment key={item.id || idx}>
                      <ListItem
                        divider
                        sx={{
                          opacity: item.enabled !== false ? 1 : 0.55,
                        }}
                        secondaryAction={
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleEditMenuItem(item, idx)}
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
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography variant="body2">
                                {item.label}
                              </Typography>
                              <Chip
                                label={
                                  item.enabled !== false ? 'On' : 'Off'
                                }
                                size="small"
                                color={
                                  item.enabled !== false
                                    ? 'success'
                                    : 'error'
                                }
                                variant="outlined"
                                sx={{ height: 20, fontSize: 11 }}
                              />
                              {item.items?.length > 0 && (
                                <Chip
                                  label={`${item.items.length} sub-item${item.items.length !== 1 ? 's' : ''}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: 11 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant="caption"
                                fontFamily="monospace"
                              >
                                {item.route}
                              </Typography>
                              {item.featureFlags?.length > 0 && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    gap: 0.5,
                                    mt: 0.5,
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  {item.featureFlags.map((flag: string) => (
                                    <Chip
                                      key={flag}
                                      icon={
                                        <FlagIcon sx={{ fontSize: 12 }} />
                                      }
                                      label={flag}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      sx={{ height: 20, fontSize: 11 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {item.items?.length > 0 && (
                        <List dense disablePadding sx={{ pl: 4, borderLeft: '2px solid', borderColor: 'divider' }}>
                          {item.items.map((child: any, childIdx: number) => (
                            <ListItem
                              key={child.id || childIdx}
                              divider
                              sx={{ opacity: child.enabled !== false ? 1 : 0.55, py: 0.5 }}
                            >
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption">{child.label}</Typography>
                                    <Chip
                                      label={child.enabled !== false ? 'On' : 'Off'}
                                      size="small"
                                      color={child.enabled !== false ? 'success' : 'error'}
                                      variant="outlined"
                                      sx={{ height: 18, fontSize: 10 }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Typography variant="caption" fontFamily="monospace" sx={{ fontSize: 11 }}>
                                    {child.route}
                                  </Typography>
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </React.Fragment>
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
      <Dialog
        open={itemDialogOpen}
        onClose={handleItemDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editItemIndex >= 0 ? 'Edit Menu Item' : 'Add Menu Item'}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}
          >
            <TextField
              label="Label"
              value={selectedItem?.label || ''}
              onChange={(e: any) =>
                setSelectedItem((prev: any) => ({
                  ...prev,
                  label: e.target.value,
                }))
              }
              fullWidth
            />
            <TextField
              label="Icon"
              value={selectedItem?.icon || ''}
              onChange={(e: any) =>
                setSelectedItem((prev: any) => ({
                  ...prev,
                  icon: e.target.value,
                }))
              }
              fullWidth
              helperText="Material icon name (e.g., dashboard, settings)"
            />
            <TextField
              label="Route"
              value={selectedItem?.route || ''}
              onChange={(e: any) =>
                setSelectedItem((prev: any) => ({
                  ...prev,
                  route: e.target.value,
                }))
              }
              fullWidth
              helperText="Route path (e.g., /dashboard, /settings)"
            />
            <TextField
              label="Roles"
              value={selectedItem?.roles?.join(', ') || ''}
              onChange={(e: any) =>
                setSelectedItem((prev: any) => ({
                  ...prev,
                  roles: e.target.value
                    .split(',')
                    .map((r: string) => r.trim())
                    .filter(Boolean),
                }))
              }
              fullWidth
              helperText="Comma-separated list of required roles"
            />
            <Autocomplete
              multiple
              options={featureFlagOptions}
              value={selectedItem?.featureFlags || []}
              onChange={(_: any, newValue: string[]) =>
                setSelectedItem((prev: any) => ({
                  ...prev,
                  featureFlags: newValue,
                }))
              }
              freeSolo
              renderTags={(value: string[], getTagProps: any) =>
                value.map((option: string, index: number) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    size="small"
                    color="primary"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params: any) => (
                <TextField
                  {...params}
                  label="Feature Flags"
                  helperText="Select feature flags required for this menu item"
                />
              )}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={selectedItem?.enabled !== false}
                  onChange={(e: any) =>
                    setSelectedItem((prev: any) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
              }
              label="Enabled"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleItemDialogClose}>Cancel</Button>
          <Button onClick={handleSaveMenuItem} variant="contained">
            {editItemIndex >= 0 ? 'Update' : 'Add'}
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

