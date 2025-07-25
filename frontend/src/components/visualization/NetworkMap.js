import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * Network topology map visualization
 */
function NetworkMap({ data }) {
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!data || !data.devices || !data.connections || data.devices.length === 0) {
      return;
    }
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    // SVG dimensions
    const width = 800;
    const height = 500;
    
    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);
    
    // Create simulation
    const simulation = d3.forceSimulation(data.devices)
      .force('link', d3.forceLink(data.connections)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Draw connections
    const links = svg.append('g')
      .selectAll('line')
      .data(data.connections)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.traffic_volume / 10) || 1);
    
    // Create a group for each device
    const nodes = svg.append('g')
      .selectAll('g')
      .data(data.devices)
      .join('g')
      .call(drag(simulation));
    
    // Draw circles for devices
    nodes.append('circle')
      .attr('r', d => getDeviceSize(d))
      .attr('fill', d => getDeviceColor(d))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add text labels
    nodes.append('text')
      .attr('dy', '-1.2em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => d.ip_address);
    
    // Update positions on simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      nodes
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag behavior
    function drag(simulation) {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }
  }, [data]);
  
  if (!data || !data.devices || data.devices.length === 0) {
    return <div className="no-data">No network data available</div>;
  }
  
  return (
    <div className="network-map">
      <svg ref={svgRef}></svg>
    </div>
  );
}

/**
 * Get device node size based on type
 */
function getDeviceSize(device) {
  switch (device.device_type) {
    case 'plc':
      return 15;
    case 'hmi':
      return 12;
    case 'workstation':
      return 10;
    default:
      return 8;
  }
}

/**
 * Get device color based on status and risk
 */
function getDeviceColor(device) {
  if (!device.is_online) {
    return '#aaa'; // Offline
  }
  
  // Color based on risk score
  if (device.risk_score > 70) {
    return '#dc3545'; // Danger
  } else if (device.risk_score > 40) {
    return '#ffc107'; // Warning
  } else {
    return '#28a745'; // Safe
  }
}

export default NetworkMap; 