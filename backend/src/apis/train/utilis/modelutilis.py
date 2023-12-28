import json
import os
import glob
import tensorflow as tf
import tensorflow.keras.callbacks as cb
import asyncio



async def update_training_status(epoch, history, websocket):
    update = {
        'epoch': epoch+1,
        'loss': history.history['loss'][0],
        'accuracy': history.history['accuracy'][0],
        'val_loss': history.history['val_loss'][0],
        'val_accuracy': history.history['val_accuracy'][0],
    }
    if websocket is not None:
        await websocket.send_json(update)
    return update

# Define a function to save the model and send a message
async def save_model_and_send_message(model, model_save, websocket):
    model.save(model_save)
    if websocket is not None:
        save_message = {
            'status': 'model_saved',
            'model_path': model_save
        }
        await websocket.send_text(json.dumps(save_message))

# Define a function to delete old checkpoints
def delete_old_checkpoints(checkpoint_dir):
    checkpoints = glob.glob(os.path.join(checkpoint_dir, "checkpoint_*.h5"))
    checkpoints.sort()
    for checkpoint in checkpoints[:-1]:  
        os.remove(checkpoint)