import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

/**
 * Security trends visualization component
 * Shows security incidents over time categorized by severity
 */
function SecurityTrends({ data, timeRange = 'weekly' }) {
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    if (!data || !data.length) {
      return;
    }
    
    const processData = () => {
      // Group incidents by time period
      let periods = [];
      
      if (timeRange === 'daily') {
        // Last 24 hours in 4-hour intervals
        for (let i = 0; i < 24; i += 4) {
          periods.push({
            name: `${i}:00 - ${i + 4}:00`,
            start: new Date(new Date().setHours(new Date().getHours() - 24 + i, 0, 0, 0)),
            end: new Date(new Date().setHours(new Date().getHours() - 24 + i + 4, 0, 0, 0))
          });
        }
      } else if (timeRange === 'weekly') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          periods.push({
            name: dayName,
            start: new Date(date.setHours(0, 0, 0, 0)),
            end: new Date(date.setHours(23, 59, 59, 999))
          });
        }
      } else if (timeRange === 'monthly') {
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - (i * 7) - 6);
          const endDate = new Date();
          endDate.setDate(endDate.getDate() - (i * 7));
          
          const weekStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const weekEnd = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          periods.push({
            name: `${weekStart} - ${weekEnd}`,
            start: new Date(startDate.setHours(0, 0, 0, 0)),
            end: new Date(endDate.setHours(23, 59, 59, 999))
          });
        }
      }
      
      // Count incidents by severity for each period
      const formattedData = periods.map(period => {
        const filteredAlerts = data.filter(alert => {
          const alertDate = new Date(alert.timestamp);
          return alertDate >= period.start && alertDate <= period.end;
        });
        
        // Count by severity
        const critical = filteredAlerts.filter(a => a.severity === 'critical').length;
        const high = filteredAlerts.filter(a => a.severity === 'high').length;
        const medium = filteredAlerts.filter(a => a.severity === 'medium').length;
        const low = filteredAlerts.filter(a => a.severity === 'low').length;
        
        return {
          name: period.name,
          critical,
          high,
          medium,
          low,
          total: critical + high + medium + low
        };
      });
      
      setChartData(formattedData);
    };
    
    processData();
  }, [data, timeRange]);
  
  if (!chartData.length) {
    return <div className="no-data">No trend data available</div>;
  }
  
  // Color mapping for severity levels
  const colors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#28a745'
  };
  
  const getBarLabel = (value) => {
    return value > 0 ? value : '';
  };
  
  return (
    <div className="security-trends">
      <div className="trends-header">
        <h3>Security Incident Trends</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
          />
          <Legend />
          <Bar 
            dataKey="critical" 
            stackId="a" 
            name="Critical" 
            fill={colors.critical} 
            label={props => getBarLabel(props.value)}
          />
          <Bar 
            dataKey="high" 
            stackId="a" 
            name="High" 
            fill={colors.high} 
            label={props => getBarLabel(props.value)}
          />
          <Bar 
            dataKey="medium" 
            stackId="a" 
            name="Medium" 
            fill={colors.medium} 
            label={props => getBarLabel(props.value)}
          />
          <Bar 
            dataKey="low" 
            stackId="a" 
            name="Low" 
            fill={colors.low} 
            label={props => getBarLabel(props.value)}
          />
        </BarChart>
      </ResponsiveContainer>
      
      <div className="trends-controls">
        <div className="btn-group" role="group">
          <button 
            type="button" 
            className={`btn btn-sm ${timeRange === 'daily' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {}}
          >
            Day
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${timeRange === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {}}
          >
            Week
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${timeRange === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => {}}
          >
            Month
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecurityTrends; 