import React from 'react';
import TableChatGPT from "./components/TableChat";
import './styles/globals.css';

export default function App() {
    return (
        <div className="min-h-screen bg-background dark">
            <div className="container mx-auto p-4">
                <TableChatGPT />
            </div>
        </div>
    );
} 