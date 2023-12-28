import React from 'react';
import Uploadcon from './components/uploadcon/Uploadcon';
import './index.css';
import { TrainingProvider } from './contexts/TrainingContext';
import WebSocketChart from './components/chart/WebSocketChart';


const App = () => {


    return (
       <TrainingProvider>        
        <div className="App">
            <Uploadcon />
            <WebSocketChart />
            
        </div>
       </TrainingProvider>  

    );
};
export default App;



