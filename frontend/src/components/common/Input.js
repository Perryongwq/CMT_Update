import React from 'react';

const Input = ({ type, value, onChange, name, label ,style }) => {
    return (
        <div style ={{display: 'flex', alignItems:'center'}}>
            <label htmlFor={name} style={{marginRight:'2px'}}>{label}</label>
            <input id={name} type={type} value={value} onChange={onChange} name={name} style={style} />
        </div>
        
    );
};

export default Input;