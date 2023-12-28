import React, { createContext, useContext, useState } from 'react';

const TrainingContext = createContext();

export const useTraining = () => useContext(TrainingContext);

export const TrainingProvider = ({ children }) => {
    const [trainingDir, setTrainingDir] = useState('');
    const [validationDir, setValidationDir] = useState('');

    const updateTrainingDir = (dir) => {
        setTrainingDir(dir);
    };

    const updateValidationDir = (dir) => {
        setValidationDir(dir);
    };

    return (
        <TrainingContext.Provider value={{ trainingDir, validationDir, updateTrainingDir, updateValidationDir }}>
            {children}
        </TrainingContext.Provider>
    );
};