import * as React from 'react';
import {
    Container,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Box,
    // TextField,
    Typography,
    // FormGroup,
    // FormControlLabel,
    // Checkbox,
    SelectChangeEvent,
  
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { getJupyterLabTheme } from '../theme-provider';
import { AgentList, Agent } from '../models';

interface IAIPanelProps {
  currentAgent: Agent;
  agentList: AgentList;
  onCurrentAgentChange: (name: string) => void;
}

export const AIPanelComponent = (props: IAIPanelProps) => {
  const [currentAgent, setAgent] = React.useState<string>(props.currentAgent.name);
  const [currentAgentDescription, setAgentDescription] = React.useState<string>(props.currentAgent.description);

  const handleCurrentAgentChange = (event: SelectChangeEvent) => {
    props.onCurrentAgentChange(event.target.value);
    setAgent(event.target.value);
    let agent = props.agentList.find((agent) => {
      agent.name == event.target.value
    })
    if (agent) {
      setAgentDescription(agent.description);
    }
  }
  
  return (
    <div>
      <ThemeProvider theme={getJupyterLabTheme()}>
        <Container>
          <Typography variant='h6' gutterBottom>
            AI Agent Configuration
          </Typography>
          <Divider variant="middle"></Divider>
          <Box sx={{ minWidth: 120 }}>
            <FormControl fullWidth>
              <InputLabel id="demo-simple-select-label">Select an agent</InputLabel>
              <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={currentAgent}
                label="Select an agent"
                displayEmpty
                onChange={handleCurrentAgentChange}
              >
                {props.agentList.map(function(agent: Agent, i) {
                  return <MenuItem value={agent.name}>{agent.name}</MenuItem>;
                })}
              </Select>

            </FormControl>
          </Box>
          <Typography variant='h6' gutterBottom>
            Current Configuration
          </Typography>
          <Divider variant="middle"></Divider>
          <Typography variant='body1' display="block" gutterBottom>
              {currentAgent}
          </Typography>
          <Typography variant='body1' display="block" gutterBottom>
              {currentAgentDescription}
          </Typography>
        </Container>
      </ThemeProvider>
    </div>
  )
}