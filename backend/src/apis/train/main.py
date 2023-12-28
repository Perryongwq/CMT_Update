
import os
import matplotlib.pyplot as plt
import json
import asyncio
from pathlib import Path
from datetime import datetime
import numpy as np
import glob

#Apis & Setting import
from apis.train.utilis.dataset_info import get_dataset_info
from apis.train.utilis.traincallbacks import TrainingCallback
from core.config import Settings   
from apis.train.utilis.modelutilis import update_training_status, save_model_and_send_message, delete_old_checkpoints



#TensorFlow Library
import tensorflow as tf
import tensorflow.keras.callbacks as cb
import tensorflow.keras.models as Models
import tensorflow.keras.layers as Layers
import tensorflow.keras.optimizers as Optimizer
from tensorflow.keras.preprocessing import image_dataset_from_directory
from tensorflow.keras.callbacks import ModelCheckpoint
from tensorflow.keras.models import load_model

            
#TO DO: 
#Historical for training using db-sql
# json setting, data or history is db-sql

async def train_model(epochs,verbose, optimizer_name, learning_rate, early_stopping=False, best_model=False, reduce_lr_on_plateau= False, websocket= None, Checkpoint=False):
    
    #Config files
    batchSize = Settings.BATCHSIZE
    imgSize = Settings.IMGSIZE
    inputShape = Settings.INPUTSHAPE
    seed = Settings.SEED
    ker = Settings.KER
    sker = Settings.SKER
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    dataset_dir = os.path.join(backend_dir, "temp","dataset")
    validation_dir = os.path.join(backend_dir, "temp" ,"validation")

    #directory for saving model, checkpoint and best model
    parent = os.path.dirname(os.path.dirname(__file__))
    checkpoint_dir= os.path.join(parent, "model")
    os.makedirs(checkpoint_dir, exist_ok=True)
    checkpoint_path = os.path.join(checkpoint_dir, "checkpoint_{epoch:02d}.h5")
    best_model_path = os.path.join(checkpoint_dir, "best_model.h5") 
    latest_checkpoint = best_model_path if os.path.exists(best_model_path) else None
    model_save = os.path.join(parent,"model", datetime.now().strftime("%Y%m%d_%H%M%S_") + "model.h5")


    #dataset info
    Train_ds = image_dataset_from_directory(dataset_dir, labels="inferred", batch_size=batchSize, image_size=imgSize, seed=seed)
    g_count, ng_count, slide_count = get_dataset_info(Train_ds, websocket)
    Test_ds = image_dataset_from_directory(validation_dir, labels="inferred", batch_size=batchSize, image_size=imgSize, shuffle = False, seed=seed)
    val_g_count, val_ng_count, val_slide_count = get_dataset_info(Test_ds, websocket)

    dataset_info = {
        'status': 'dataset_info',
        'g_count': int(g_count),
        'ng_count': int(ng_count),
        'slide_count': int(slide_count),
        'val_g_count': int(val_g_count),
        'val_ng_count': int(val_ng_count),
        'val_slide_count': int(val_slide_count)
    }
    if websocket is not None:
        await websocket.send_text(json.dumps(dataset_info))

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = Train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    test_ds = Test_ds.cache().prefetch(buffer_size=AUTOTUNE)

    #Before training, check if there is a checkpoint
    if Checkpoint and latest_checkpoint:
        print("Resuming from checkpoint.")
        model = load_model(latest_checkpoint)
    else:
        model = Models.Sequential([
            Layers.Rescaling(1./255, input_shape=inputShape),
            Layers.RandomFlip(mode="horizontal_and_vertical", seed=seed),
            Layers.Conv2D(16,kernel_size=ker, activation='relu',padding='same'),
            Layers.Conv2D(32,kernel_size=sker, activation='relu',padding='same'),
            Layers.MaxPool2D(2,2),
            Layers.Conv2D(64,kernel_size=ker, activation='relu',padding='same'),
            Layers.Conv2D(128,kernel_size=sker, activation='relu',padding='same'),
            Layers.MaxPool2D(3,2),
            Layers.Conv2D(256,kernel_size=ker, activation='relu',padding='same'),
            Layers.Conv2D(512,kernel_size=sker, activation='relu',padding='same'),
            Layers.AveragePooling2D(3),
            Layers.Flatten(),
            Layers.Dropout(0.3),
            Layers.Dense(3,activation='softmax')])
        

    model_checkpoint_callback = ModelCheckpoint(
        filepath=checkpoint_path,
        save_weights_only=False,
        monitor='val_accuracy',
        mode='max',
        save_best_only=False,
        save_freq='epoch', 
    )

    best_model_callback = ModelCheckpoint(
        filepath=best_model_path,
        save_weights_only=False,
        monitor='val_accuracy',
        mode='max',
        save_best_only=True,       
    )

    #optimizer Selection 
    if optimizer_name.lower() == 'adam':
        optimizer  =Optimizer.Adam(learning_rate=learning_rate)
    elif optimizer_name.lower() == 'sgd':
        optimizer = Optimizer.SGD(learning_rate=learning_rate)
    else:
        raise ValueError(f"Unsupported optimizer: {optimizer_name}")
    
    model.compile(optimizer=optimizer,loss='sparse_categorical_crossentropy',metrics=['accuracy'])

    #callbacks include tensorboard, model checkpoint, best model, early stopping, reduce lr on plateau, websocket
    log_dir="logs/fit/" + datetime.now().strftime("%Y%m%d_%H%M%S")
    tensorboard = tf.keras.callbacks.TensorBoard(log_dir=log_dir, histogram_freq=1)
    callbacks = [tensorboard, model_checkpoint_callback,best_model_callback]
   
    callback_dict ={
        'early_stopping': cb.EarlyStopping(monitor='val_loss', patience=7, verbose=1, mode='min') if early_stopping or epochs > 50 else None,
        'best_model': ModelCheckpoint(best_model_path, monitor='val_loss', save_best_only=True, verbose=1) if best_model else None,
        'reduce_lr_on_plateau': cb.ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=3, min_lr=0.00001, verbose=1) if reduce_lr_on_plateau or epochs > 50 else None,
        'websocket': TrainingCallback(websocket) if websocket else None
    }

    for callback in callback_dict.values():
        if callback is not None:
            callbacks.append(callback)

    # Main training loop
    for epoch in range(epochs):
        # print(f"Training Epoch: {epoch+1}")
        history = model.fit(
            train_ds,
            validation_data=test_ds,
            initial_epoch=epoch,
            epochs= epoch+1,
            verbose=verbose,
            callbacks =callbacks)
        update = await update_training_status(epoch, history, websocket)    
        
        if websocket is not None:
            await websocket.send_json({'update': update, 'model_path': model_save})

    await save_model_and_send_message(model, model_save, websocket)
    delete_old_checkpoints(checkpoint_dir)




