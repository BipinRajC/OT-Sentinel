import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  IconButton,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Factory as FactoryIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(145deg, #0f1322 0%, #1a2332 100%)',
  border: '1px solid #00ffff',
  borderRadius: '16px',
  boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
  height: '100%',
}));

const ChatContainer = styled(Box)(({ theme }) => ({
  height: '500px',
  overflowY: 'auto',
  padding: theme.spacing(2),
  background: 'rgba(2, 5, 8, 0.5)',
  borderRadius: '12px',
  border: '1px solid #1a2332',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'rgba(0, 255, 255, 0.1)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'linear-gradient(145deg, #00ffff, #00e5ff)',
    borderRadius: '4px',
  },
}));

const MessageBubble = styled(Paper)(({ theme, isUser }) => ({
  padding: theme.spacing(1.5, 2),
  marginBottom: theme.spacing(1),
  maxWidth: '80%',
  alignSelf: isUser ? 'flex-end' : 'flex-start',
  background: isUser
    ? 'linear-gradient(145deg, #00ffff, #00e5ff)'
    : 'linear-gradient(145deg, #0f1322, #1a2332)',
  color: isUser ? '#000000' : theme.palette.text.primary,
  borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
}));

// Function to process AI response text - remove markdown and format nicely
const processAIResponse = (text) => {
  if (!text) return '';
  
  let processed = text
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove markdown bold/italic
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.*?)`/g, '$1')
    // Convert markdown lists to simple format
    .replace(/^[\s]*[-\*\+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '• $1')
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Clean up spaces
    .replace(/[ \t]+/g, ' ')
    .trim();

  // Split into paragraphs and bullet points
  const lines = processed.split('\n').filter(line => line.trim());
  const result = [];
  let currentParagraph = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('•')) {
      // If we have accumulated paragraph text, add it first
      if (currentParagraph.length > 0) {
        result.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      result.push(trimmed);
    } else if (trimmed) {
      currentParagraph.push(trimmed);
    }
  }
  
  // Add any remaining paragraph
  if (currentParagraph.length > 0) {
    result.push(currentParagraph.join(' '));
  }
  
  return result.join('\n\n');
};

const predefinedQuestions = [
  {
    category: 'Security',
    icon: <SecurityIcon />,
    questions: [
      'What are the current security threats in my industrial network?',
      'How can I improve the security of my SCADA system?',
      'What are the best practices for OT security?',
      'Explain the latest vulnerabilities in Modbus protocol',
    ],
  },
  {
    category: 'Industrial Process',
    icon: <FactoryIcon />,
    questions: [
      'How can I optimize the TenEast process control system?',
      'What do the current valve and flow readings indicate?',
      'How to interpret pressure and level measurements?',
      'Best practices for industrial automation',
    ],
  },
  {
    category: 'Alerts & Monitoring',
    icon: <WarningIcon />,
    questions: [
      'How should I respond to critical security alerts?',
      'What patterns should I look for in network traffic?',
      'How to set up effective monitoring for ICS networks?',
      'Explain anomaly detection in industrial systems',
    ],
  },
  {
    category: 'Analytics',
    icon: <TrendingUpIcon />,
    questions: [
      'How can I improve operational efficiency?',
      'What trends should I monitor in my industrial data?',
      'How to predict equipment failures?',
      'Best practices for industrial data analytics',
    ],
  },
];

function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your Industrial Security AI Assistant. I can help you with OT security, industrial process optimization, threat analysis, and system monitoring. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Check backend connection status
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/health');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.environment.has_gemini_key ? 'connected' : 'no_key');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Error checking backend connection:', error);
      setConnectionStatus('error');
    }
  };

  const callAI = async (message) => {
    try {
      const response = await fetch('http://localhost:8000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle the new API response format
      if (data.status === 'success') {
      return data.response || 'Sorry, I could not generate a response.';
      } else {
        throw new Error(data.message || 'AI service error');
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await callAI(inputValue);
      
      const aiMessage = {
        id: Date.now() + 1,
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        text: `I apologize, but I encountered an error: ${error.message}. Please try again or contact support if the issue persists.`,
        isUser: false,
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleQuestionClick = (question) => {
    setInputValue(question);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your Industrial Security AI Assistant. How can I help you today?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'checking': return 'info';
      case 'no_key': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'AI Assistant Ready';
      case 'checking': return 'Checking Connection...';
      case 'no_key': return 'AI API Key Not Configured';
      case 'error': return 'Connection Error';
      default: return 'Unknown Status';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom sx={{ 
            fontWeight: 600,
            background: 'linear-gradient(145deg, #00bcd4, #0288d1)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 3
          }}>
            <PsychologyIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            AI Security Assistant
          </Typography>
        </Grid>

        {/* Connection Status */}
        <Grid item xs={12}>
          <Alert 
            severity={getConnectionStatusColor()} 
            sx={{ mb: 2 }}
            icon={connectionStatus === 'connected' ? <CheckCircleIcon /> : <WarningIcon />}
          >
            <strong>{getConnectionStatusText()}</strong>
            {connectionStatus === 'no_key' && (
              <div>
                The AI assistant requires a Google Gemini API key to be configured in the backend environment variables.
                Please contact your system administrator.
              </div>
            )}
            {connectionStatus === 'error' && (
              <div>
                Unable to connect to the backend AI service. Please check your network connection and try again.
              </div>
            )}
          </Alert>
        </Grid>

        <Grid item xs={12} md={8}>
          <StyledCard>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Chat Assistant
                </Typography>
                <IconButton onClick={handleClearChat} size="small">
                  <ClearIcon />
                </IconButton>
              </Box>

              <ChatContainer>
                {messages.map((message) => (
                  <Box key={message.id} sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.isUser ? 'flex-end' : 'flex-start',
                    mb: 2
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      {!message.isUser && (
                        <Avatar sx={{ 
                          bgcolor: 'primary.main',
                          width: 32,
                          height: 32,
                          mr: 1
                        }}>
                          <PsychologyIcon fontSize="small" />
                        </Avatar>
                      )}
                      
                      <MessageBubble isUser={message.isUser} elevation={3}>
                        <Typography variant="body2" sx={{ 
                          lineHeight: 1.6,
                          whiteSpace: 'pre-line',
                          wordBreak: 'break-word'
                        }}>
                          {message.isUser ? message.text : processAIResponse(message.text)}
                        </Typography>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mt: 1
                        }}>
                          <Typography variant="caption" sx={{ 
                            opacity: 0.7,
                            fontSize: '0.7rem'
                          }}>
                            {message.timestamp.toLocaleTimeString()}
                          </Typography>
                          
                          <IconButton
                            size="small"
                            onClick={() => handleCopyMessage(message.text)}
                            sx={{ opacity: 0.7, ml: 1 }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </MessageBubble>

                      {message.isUser && (
                        <Avatar sx={{ 
                          bgcolor: 'secondary.main',
                          width: 32,
                          height: 32,
                          ml: 1
                        }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                      )}
                    </Box>
                  </Box>
                ))}
                
                {isLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      <PsychologyIcon fontSize="small" />
                    </Avatar>
                    <MessageBubble isUser={false}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2">Thinking...</Typography>
                      </Box>
                    </MessageBubble>
                  </Box>
                )}
                <div ref={chatEndRef} />
              </ChatContainer>

              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={3}
                  variant="outlined"
                  placeholder="Ask about industrial security, process optimization, or system monitoring..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || connectionStatus !== 'connected'}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading || connectionStatus !== 'connected'}
                        sx={{ 
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    ),
                  }}
                />
              </Box>
            </CardContent>
          </StyledCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <StyledCard>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Quick Questions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click on any question below to get started:
              </Typography>

              {predefinedQuestions.map((category, index) => (
                <Accordion 
                  key={index}
                  sx={{ 
                    bgcolor: 'transparent',
                    border: '1px solid #3a4374',
                    mb: 1,
                    '&:before': { display: 'none' }
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {category.icon}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {category.category}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {category.questions.map((question, qIndex) => (
                      <Chip
                        key={qIndex}
                        label={question}
                        onClick={() => handleQuestionClick(question)}
                        sx={{
                          m: 0.5,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: 'primary.dark',
                          }
                        }}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </StyledCard>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AIAssistant; 