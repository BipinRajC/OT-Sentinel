import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Backup as BackupIcon,
  Update as UpdateIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

function SystemSettings({ onSave }) {
  const [settings, setSettings] = useState({
    realTimeMonitoring: true,
    autoAlerts: true,
    emailNotifications: false,
    smsNotifications: false,
    dataRetention: 30,
    refreshInterval: 5,
    apiTimeout: 30,
    maxAlerts: 1000,
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" color="primary" mb={3}>
        System Settings
      </Typography>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SettingsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  General Settings
                </Typography>
              </Box>
              
              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.realTimeMonitoring}
                      onChange={(e) => handleSettingChange('realTimeMonitoring', e.target.checked)}
                    />
                  }
                  label="Real-time Monitoring"
                />
              </Box>

              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoAlerts}
                      onChange={(e) => handleSettingChange('autoAlerts', e.target.checked)}
                    />
                  }
                  label="Automatic Alerts"
                />
              </Box>

              <TextField
                fullWidth
                label="Data Retention (days)"
                type="number"
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Refresh Interval (seconds)"
                type="number"
                value={settings.refreshInterval}
                onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Notifications
                </Typography>
              </Box>

              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
              </Box>

              <Box mb={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
              </Box>

              <TextField
                fullWidth
                label="Max Alerts"
                type="number"
                value={settings.maxAlerts}
                onChange={(e) => handleSettingChange('maxAlerts', parseInt(e.target.value))}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="API Timeout (seconds)"
                type="number"
                value={settings.apiTimeout}
                onChange={(e) => handleSettingChange('apiTimeout', parseInt(e.target.value))}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                System Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Version"
                        secondary="OT Security Dashboard v1.0.0"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Last Update"
                        secondary={new Date().toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Database Status"
                        secondary={<Chip label="Connected" color="success" size="small" />}
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <List>
                    <ListItem>
                      <ListItemText 
                        primary="Backend API"
                        secondary={<Chip label="Online" color="success" size="small" />}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Redis Connection"
                        secondary={<Chip label="Active" color="success" size="small" />}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="WebSocket Status"
                        secondary={<Chip label="Connected" color="success" size="small" />}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Save Button */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size="large"
            >
              Save Settings
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SystemSettings;
