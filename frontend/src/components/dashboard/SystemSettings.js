import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon
} from '@mui/icons-material';

function SystemSettings({ onSave, onSettingsUpdate }) {
  const [settings, setSettings] = useState({
    // Existing settings
    autoRefresh: true,
    refreshInterval: 5,
    theme: 'dark',
    
    // New notification settings
    notifications: {
      enabled: true,
      rateLimitSeconds: 10,
      highVolumeThreshold: 10,
      suppressHighVolume: true,
      allowedSeverities: ['high', 'critical'],
      allowedAttackTypes: ['dos', 'ddos', 'modbus_attack', 'probe', 'r2l', 'u2r'],
      soundEnabled: true,
      showCriticalDialog: true
    }
  });
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('ot-sentinel-settings');
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
    }
  }, []);

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleSaveSettings = () => {
    localStorage.setItem('ot-sentinel-settings', JSON.stringify(settings));
    if (onSave) {
      onSave(settings);
    }
    if (onSettingsUpdate) {
      onSettingsUpdate(settings);
    }
    setSaveStatus('Settings saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const attackTypeOptions = [
    { value: 'dos', label: 'DoS Attacks', color: '#f44336' },
    { value: 'ddos', label: 'DDoS Attacks', color: '#d32f2f' },
    { value: 'modbus_attack', label: 'Modbus Attacks', color: '#e91e63' },
    { value: 'probe', label: 'Network Probes', color: '#ff9800' },
    { value: 'r2l', label: 'Remote-to-Local', color: '#9c27b0' },
    { value: 'u2r', label: 'User-to-Root', color: '#ff5722' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <SettingsIcon sx={{ mr: 2 }} />
        System Settings
      </Typography>

      {saveStatus && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {saveStatus}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 1 }} />
                General Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoRefresh}
                    onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                  />
                }
                label="Auto-refresh dashboard"
                sx={{ display: 'block', mb: 2 }}
              />
              
              <Typography gutterBottom>Refresh Interval (seconds)</Typography>
              <Slider
                value={settings.refreshInterval}
                onChange={(e, value) => handleSettingChange('refreshInterval', value)}
                min={1}
                max={30}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                >
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                Notification Settings
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.enabled}
                    onChange={(e) => handleSettingChange('notifications.enabled', e.target.checked)}
                  />
                }
                label="Enable notifications"
                sx={{ display: 'block', mb: 2 }}
              />
              
              {settings.notifications.enabled && (
                <>
                  <Typography gutterBottom>Rate Limit (seconds between notifications)</Typography>
                  <Slider
                    value={settings.notifications.rateLimitSeconds}
                    onChange={(e, value) => handleSettingChange('notifications.rateLimitSeconds', value)}
                    min={5}
                    max={60}
                    step={5}
                    marks={[
                      { value: 5, label: '5s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '60s' }
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ mb: 3 }}
                  />
                  
                  <Typography gutterBottom>High Volume Threshold</Typography>
                  <Slider
                    value={settings.notifications.highVolumeThreshold}
                    onChange={(e, value) => handleSettingChange('notifications.highVolumeThreshold', value)}
                    min={5}
                    max={50}
                    step={5}
                    marks={[
                      { value: 5, label: '5' },
                      { value: 25, label: '25' },
                      { value: 50, label: '50' }
                    ]}
                    valueLabelDisplay="auto"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 3 }}>
                    Suppress individual notifications when attack volume exceeds this threshold
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.suppressHighVolume}
                        onChange={(e) => handleSettingChange('notifications.suppressHighVolume', e.target.checked)}
                      />
                    }
                    label="Suppress notifications during high volume attacks"
                    sx={{ display: 'block', mb: 2 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.soundEnabled}
                        onChange={(e) => handleSettingChange('notifications.soundEnabled', e.target.checked)}
                      />
                    }
                    label="Sound notifications"
                    sx={{ display: 'block', mb: 2 }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.notifications.showCriticalDialog}
                        onChange={(e) => handleSettingChange('notifications.showCriticalDialog', e.target.checked)}
                      />
                    }
                    label="Show critical alert dialogs"
                    sx={{ display: 'block', mb: 3 }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Notification Settings */}
        <Grid item xs={12}>
          <Accordion sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <SecurityIcon sx={{ mr: 1 }} />
                Advanced Notification Filters
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Notification Severity Levels
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {['low', 'medium', 'high', 'critical'].map((severity) => (
                      <FormControlLabel
                        key={severity}
                        control={
                          <Switch
                            checked={settings.notifications.allowedSeverities.includes(severity)}
                            onChange={(e) => {
                              const newSeverities = e.target.checked
                                ? [...settings.notifications.allowedSeverities, severity]
                                : settings.notifications.allowedSeverities.filter(s => s !== severity);
                              handleSettingChange('notifications.allowedSeverities', newSeverities);
                            }}
                          />
                        }
                        label={severity.charAt(0).toUpperCase() + severity.slice(1)}
                        sx={{ display: 'block' }}
                      />
                    ))}
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Attack Types to Monitor
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {attackTypeOptions.map((attackType) => (
                      <Box key={attackType.value} sx={{ mb: 1 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={settings.notifications.allowedAttackTypes.includes(attackType.value)}
                              onChange={(e) => {
                                const newTypes = e.target.checked
                                  ? [...settings.notifications.allowedAttackTypes, attackType.value]
                                  : settings.notifications.allowedAttackTypes.filter(t => t !== attackType.value);
                                handleSettingChange('notifications.allowedAttackTypes', newTypes);
                              }}
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Chip
                                size="small"
                                label={attackType.label}
                                sx={{
                                  backgroundColor: attackType.color,
                                  color: 'white',
                                  ml: 1
                                }}
                              />
                            </Box>
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSaveSettings}
          startIcon={<SaveIcon />}
          sx={{ 
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#45a049' }
          }}
        >
          Save Settings
        </Button>
      </Box>
    </Box>
  );
}

export default SystemSettings;
