import React, { ChangeEvent, useState, useRef } from "react";
import axios from "axios";
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface UploadResponse {
    columns: string[];
    rows: number;
    preview: Record<string, any>[];
}

export const FileUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (selectedFile: File) => {
        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            await axios.post<UploadResponse>("http://localhost:8000/upload", formData);
            // Можно добавить уведомление об успехе здесь
        } catch (error) {
            console.error('Failed to upload file:', error);
            // Можно добавить уведомление об ошибке здесь
        }
    };

    return (
        <div className="flex justify-end">
            <Input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
            />
            <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="px-6"
            >
                <Upload className="h-4 w-4 mr-2" />
                Upload Table
            </Button>
        </div>
    );
}; 