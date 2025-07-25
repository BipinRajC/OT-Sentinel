import React, { useEffect, useRef, useState } from 'react';
import { Box, Card, CardContent, Typography, Chip, Switch, FormControlLabel, Slider, Grid } from '@mui/material';
import * as d3 from 'd3';

const ATTACK_TYPE_COLORS = {
  normal: '#4caf50',
  dos: '#f44336',
  probe: '#ff9800',
  r2l: '#9c27b0',
  u2r: '#e91e63',
  modbus_attack: '#d32f2f',
};

const SEVERITY_COLORS = {
  normal: '#4caf50',
  low: '#ffeb3b',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#d32f2f',
};

function RealTimeNetworkGraph({ data = { nodes: [], edges: [] } }) {
  const svgRef = useRef();
  const [showLabels, setShowLabels] = useState(true);
  const [nodeSize, setNodeSize] = useState(20);
  const [linkStrength, setLinkStrength] = useState(0.7);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!data.nodes || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Set up SVG
    svg.attr("width", width).attr("height", height);

    const container = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Process data
    const nodes = data.nodes.map(d => ({
      ...d,
      id: d.id || d.ip,
      totalTraffic: (d.attack_count || 0) + (d.normal_count || 0),
      riskScore: d.attack_count / Math.max(1, (d.attack_count || 0) + (d.normal_count || 0)),
    }));

    const links = data.edges.map(d => ({
      ...d,
      source: d.source,
      target: d.target,
      color: ATTACK_TYPE_COLORS[d.attack_type] || ATTACK_TYPE_COLORS.normal,
      weight: d.packet_count || 1,
    }));

    // Create scales
    const nodeRadiusScale = d3.scaleLinear()
      .domain(d3.extent(nodes, d => d.totalTraffic))
      .range([nodeSize * 0.5, nodeSize * 2])
      .clamp(true);

    const linkWidthScale = d3.scaleLinear()
      .domain(d3.extent(links, d => d.weight))
      .range([1, 8])
      .clamp(true);

    // Set up force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links)
        .id(d => d.id)
        .strength(linkStrength)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter((width - margin.left - margin.right) / 2, (height - margin.top - margin.bottom) / 2))
      .force("collision", d3.forceCollide().radius(d => nodeRadiusScale(d.totalTraffic) + 5));

    // Create arrow markers for directed links
    const defs = svg.append("defs");
    
    Object.entries(ATTACK_TYPE_COLORS).forEach(([type, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color);
    });

    // Create links
    const link = container.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", d => d.color)
      .attr("stroke-width", d => linkWidthScale(d.weight))
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", d => `url(#arrow-${d.attack_type || 'normal'})`);

    // Create nodes
    const node = container.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node");

    // Node circles
    node.append("circle")
      .attr("r", d => nodeRadiusScale(d.totalTraffic))
      .attr("fill", d => {
        if (d.riskScore > 0.7) return SEVERITY_COLORS.critical;
        if (d.riskScore > 0.5) return SEVERITY_COLORS.high;
        if (d.riskScore > 0.3) return SEVERITY_COLORS.medium;
        if (d.riskScore > 0.1) return SEVERITY_COLORS.low;
        return SEVERITY_COLORS.normal;
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer");

    // Node labels
    if (showLabels) {
      node.append("text")
        .attr("dx", d => nodeRadiusScale(d.totalTraffic) + 5)
        .attr("dy", 4)
        .style("font-size", "12px")
        .style("font-family", "Arial, sans-serif")
        .style("fill", "#333")
        .text(d => d.ip || d.id);
    }

    // Add drag behavior
    const drag = d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag);

    // Add click behavior
    node.on("click", (event, d) => {
      setSelectedNode(d);
    });

    // Add hover behavior
    node.on("mouseover", (event, d) => {
      // Highlight connected links
      link.style("stroke-opacity", l => 
        (l.source.id === d.id || l.target.id === d.id) ? 1.0 : 0.1
      );
      
      // Show tooltip
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.8)")
        .style("color", "white")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("z-index", 1000);

      tooltip.html(`
        <strong>IP: ${d.ip}</strong><br/>
        Normal Traffic: ${d.normal_count || 0}<br/>
        Attacks: ${d.attack_count || 0}<br/>
        Risk Score: ${(d.riskScore * 100).toFixed(1)}%
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", () => {
      // Reset link opacity
      link.style("stroke-opacity", 0.6);
      
      // Remove tooltip
      d3.select(".tooltip").remove();
    });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Cleanup function
    return () => {
      simulation.stop();
      d3.select(".tooltip").remove();
    };

  }, [data, showLabels, nodeSize, linkStrength]);

  // Update simulation forces when parameters change
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const simulation = svg.select(".nodes").datum();
    
    if (simulation && simulation.force) {
      simulation.force("link").strength(linkStrength);
      simulation.alpha(0.3).restart();
    }
  }, [linkStrength]);

  return (
    <Box>
      {/* Controls */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControlLabel
            control={
              <Switch
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
            }
            label="Show Labels"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" gutterBottom>
            Node Size: {nodeSize}
          </Typography>
          <Slider
            value={nodeSize}
            min={10}
            max={40}
            step={5}
            onChange={(e, value) => setNodeSize(value)}
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" gutterBottom>
            Link Strength: {linkStrength}
          </Typography>
          <Slider
            value={linkStrength}
            min={0.1}
            max={2.0}
            step={0.1}
            onChange={(e, value) => setLinkStrength(value)}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" gutterBottom>
            Nodes: {data.nodes.length} | Edges: {data.edges.length}
          </Typography>
        </Grid>
      </Grid>

      {/* Legend */}
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item>
          <Typography variant="body2" fontWeight="bold">Risk Levels:</Typography>
        </Grid>
        {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
          <Grid item key={severity}>
            <Chip
              label={severity}
              size="small"
              sx={{ backgroundColor: color, color: 'white' }}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item>
          <Typography variant="body2" fontWeight="bold">Attack Types:</Typography>
        </Grid>
        {Object.entries(ATTACK_TYPE_COLORS).map(([type, color]) => (
          <Grid item key={type}>
            <Chip
              label={type}
              size="small"
              sx={{ backgroundColor: color, color: 'white' }}
            />
          </Grid>
        ))}
      </Grid>

      {/* Network Graph */}
      <Card variant="outlined">
        <CardContent>
          <svg ref={svgRef} style={{ width: '100%', height: '600px', border: '1px solid #e0e0e0' }}>
          </svg>
        </CardContent>
      </Card>

      {/* Selected Node Info */}
      {selectedNode && (
        <Card sx={{ mt: 2 }} variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Node Details: {selectedNode.ip}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Normal Traffic</Typography>
                <Typography variant="h6">{selectedNode.normal_count || 0}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Attack Traffic</Typography>
                <Typography variant="h6" color="error">{selectedNode.attack_count || 0}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Total Traffic</Typography>
                <Typography variant="h6">{selectedNode.totalTraffic}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="textSecondary">Risk Score</Typography>
                <Typography variant="h6" color="warning">
                  {(selectedNode.riskScore * 100).toFixed(1)}%
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default RealTimeNetworkGraph; 