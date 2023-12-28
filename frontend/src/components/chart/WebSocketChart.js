import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, LineController, LinearScale, CategoryScale, PointElement, LineElement } from 'chart.js';
import Input from '../common/Input';
import Button from '../common/Button';

Chart.register(LineController, LinearScale, CategoryScale, PointElement, LineElement);

const WebSocketChart = () => {
    const [trainingParams, setTrainingParams] = useState({
        epochs: '',
        optimizer: '',
        learning_rate: '',
        early_stopping: false,
        reducelr: false
    });
    const [webSocket, setWebSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8000/ws');

        ws.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
            setWebSocket(ws);
            initializeChart();
        };

        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
            setWebSocket(null);
        };

        ws.onerror = (error) => {
            console.log('WebSocket Error:', error);
            setIsConnected(false);
        };

        ws.onmessage = (event) => handleWebSocketMessage(JSON.parse(event.data));

        return () => {
            ws.close();
        };
    }, []);


    const handleWebSocketMessage = (data) => {
        console.log('Received data:', data);

        if (data.epoch) {
            updateChart(data.epoch, data.loss, data.val_loss, data.accuracy, data.val_accuracy);
        }

        if (data.status === 'model_saved') {
            setLoading(false);
        }
    };

    const updateChart = (epoch, trainingLoss, validationLoss, trainingAccuracy, validationAccuracy) => {
        if (chartInstance.current) {
            chartInstance.current.data.labels.push(`Epoch ${epoch}`);
            chartInstance.current.data.datasets[0].data.push(trainingLoss);
            chartInstance.current.data.datasets[1].data.push(validationLoss);
            chartInstance.current.data.datasets[2].data.push(trainingAccuracy);
            chartInstance.current.data.datasets[3].data.push(validationAccuracy);
            chartInstance.current.update();
        }
    };

    const initializeChart = useCallback(() => {
        const ctx = chartRef.current.getContext('2d');
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Training Loss',
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: [],
                    fill: false,
                }, {
                    label: 'Validation Loss',
                    backgroundColor: 'rgb(54, 162, 235)',
                    borderColor: 'rgb(54, 162, 235)',
                    data: [],
                    fill: false,
                }, {
                    label: 'Training Accuracy',
                    backgroundColor: 'rgb(75, 192, 192)',
                    borderColor: 'rgb(75, 192, 192)',
                    data: [],
                    fill: false,
                }, {
                    label: 'Validation Accuracy',
                    backgroundColor: 'rgb(153, 102, 235)',
                    borderColor: 'rgb(153, 102, 235)',
                    data: [],
                    fill: false,
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: 'Training and Validation Loss and Accuracy'
                },
                tooltips: {
                    mode: 'index',
                    intersect: false,
                },
                hover: {
                    mode: 'nearest',
                    intersect: true
                },
                scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Epoch'
                        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Metrics'
                        },
                        id: 'y-axis-metrics',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });
    }, []);

    const handleInputChange = (event) => {
        const { name, value, checked, type } = event.target;
        setTrainingParams(prevParams => ({
            ...prevParams,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const startTraining = () => {
        if (!trainingParams.epochs || trainingParams.epochs <= 0) {
            alert('Please enter a valid number of epochs.');
            return;
        }

        if (isConnected) {
            setLoading(true);
            webSocket.send(JSON.stringify(trainingParams));
        } else {
            alert('WebSocket is still connecting. Please wait.');
        }
    };

    return (
        <div className='bg-gray-100 p-1 rounded shadow-md w-2/5 h-2/5'>
            <div className='space-y-4'>
                {Object.entries(trainingParams).map(([key, value]) => (
                    <div className="flex items-center space-x-4" key={key}>
                        <label className='w-32'>{key}</label>
                        <Input 
                            className="flex-grow" 
                            style={{border: '1px solid #000'}} 
                            type={key === 'early_stopping' || key === 'reducelr' ? 'checkbox' : 'text'} 
                            name={key} 
                            value={value} 
                            onChange={handleInputChange} 
                        />
                    </div>
                ))}
            </div>
            <Button onClick={startTraining} text='Start Training' disabled={!isConnected} className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded mt-3' />
            <canvas ref={chartRef}></canvas>
            {loading && (
                <div className="flex justify-center items-center absolute top-0 left-0 w-full h-full bg-opacity-50">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="absolute">Loading...</p>
                </div>
            )}
            
        </div>
    );
};

export default WebSocketChart;
