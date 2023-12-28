import React, { useState, useRef, useEffect } from 'react';
import { useTraining } from '../../contexts/TrainingContext';

const Uploadcon = () => {
    const [trainingDataset, setTrainingDataset] = useState(null);
    const [validationDataset, setValidationDataset] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const trainingFileRef = useRef();    
    const validationFileRef = useRef();
    const [train, setDataset] = useState(null);
    const [validation, setValidation] = useState(null);


    const [datasetInfo, setDatasetInfo] = useState({
        train_dataset: { g_count: 0, ng_count: 0, slide_count: 0 },
        validation_dataset: { val_g_count: 0, val_ng_count: 0, val_slide_count: 0 }
    });    
    
    const [trainingDir, setTrainingDir] = useState('');
    const [validationDir, setValidationDir] = useState('');
    const { updateTrainingDir, updateValidationDir } = useTraining();

    const handleDatasetUpload = (event, datasetType) => {
        const file = event.target.files[0];
        if (file && file.type.match(/zip/)) {
            datasetType === 'training' ? setTrainingDataset(file) : setValidationDataset(file);
        } else {
            setMessage('Invalid File Type! Please upload a zip file.');
        }
    };

    const handleSubmit = async () => {
        if (!trainingDataset || !validationDataset) {
            setMessage('Please upload both training and validation datasets!');
            return;
        }
        setLoading(true);

        let formData = new FormData();
        formData.append('dataset', trainingDataset);
        formData.append('validation', validationDataset);

        try {
            const response = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setMessage('Datasets Upload successful!');

                // Assuming 'data' contains the directory paths 'training_dir' and 'validation_dir'
                setTrainingDir(data.training_dir);
                setValidationDir(data.validation_dir);

                // Logging directory information to the console
                console.log("Training Directory: ", data.training_dir);
                console.log("Validation Directory: ", data.validation_dir);

                // Update the context with the new directories
                updateTrainingDir(data.training_dir);
                updateValidationDir(data.validation_dir);

                setDatasetInfo(data.dataset_info);  
            } else {
                const errorText = await response.text();
                setMessage(`Error uploading datasets: ${errorText}`);
            }
        } catch (error) {
            setMessage(`Error uploading datasets: ${error.message}`);
        }

        setLoading(false);
    };

    const handleReset = () => {
        setTrainingDataset(null);
        setValidationDataset(null);
        setLoading(false);
        setDataset(null);
        setValidation(null);
        setMessage('');
        setDatasetInfo({
            train_dataset: { g_count: 0, ng_count: 0, slide_count: 0 },
            validation_dataset: { val_g_count: 0, val_ng_count: 0, val_slide_count: 0 }
        });
        if (trainingFileRef.current) trainingFileRef.current.value = '';
        if (validationFileRef.current) validationFileRef.current.value = '';
    };

    useEffect(() => {
        let alertMessage = '';
        
        if (message) {
            alertMessage += `Message: ${message}\n`;
        }
        if (trainingDataset) {
            // Extracting the file name from the trainingDataset
            const trainingFileName = trainingDataset.name;
            alertMessage += `Training Dataset: ${trainingFileName}\n`
        }
        if (validationDataset) {
            // Assuming you might want to do the same for the validation dataset
            const validationFileName = validationDataset.name;
            alertMessage += `Validation Dataset: ${validationFileName}\n`;
        }
        if (alertMessage) {
            alert(alertMessage);
        }
    }, [message, trainingDataset, validationDataset]);

    return (
        <div className='relative'>
            <h1 className='text-xl font-bold mb-1'>Upload Training and Validation Datasets</h1>
            <div className='flex'>
                <div className ='bg-gray-100 p-1 rounded shadow-md w-[20%]'>
                    <h3 className ="text-m font-semibold mb-1">Training </h3>
                    <input type="file" accept=".zip" ref={trainingFileRef} onChange={(event) => handleDatasetUpload(event, 'training')} />
                </div>
                <div className='bg-gray-100 p-1 rounded shadow-md w-[20%]' >
                    <h3 className ="text-m font-semibold mb-1">Validation </h3>
                    <input type="file" accept=".zip" ref={validationFileRef} onChange={(event) => handleDatasetUpload(event, 'validation')} />
                </div>        
                <div className=' flex flex-col justify-center ml-2'>
                    <button onClick={handleSubmit} disabled={loading} className="bg-blue-500 text-white p-1 rounded mt-4">Upload</button>
                    <button onClick={handleReset} className="bg-red-500 text-white p-1 rounded mt-4 ml-2">Reset</button>
                </div>
            </div>
            {loading && (
                <div className="flex justify-center items-center absolute top-0 left-0 w-full h-full bg-opacity-50">
                    <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="absolute">Loading..</p>
                </div>
            )}
            {datasetInfo && (
                <div className='bg-gray-100 p-rounded shadow-md mt-2 w-[40%]'>
                    <h2 className='text-m font-bold mb-1'>Dataset Info:</h2>
                    <table>
                        <thead>
                            <tr>
                                <th></th>
                                <th className='border px-2'>G Count</th>
                                <th className='border px-2'>NG Count</th>
                                <th className='border px-2'>Slide Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className='border px-2'>Training</td>
                                <td className='border px-2'>{datasetInfo.train_dataset.g_count}</td>
                                <td className='border px-2'>{datasetInfo.train_dataset.ng_count}</td>
                                <td className='border px-2'>{datasetInfo.train_dataset.slide_count}</td>
                            </tr>
                            <tr>
                                <td className='border px-2'>Validation </td>
                                <td className='border px-2'>{datasetInfo.validation_dataset.val_g_count}</td>
                                <td className='border px-2'>{datasetInfo.validation_dataset.val_ng_count}</td>
                                <td className='border px-2'>{datasetInfo.validation_dataset.val_slide_count}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Uploadcon;
