import React, { useState, useRef, useEffect, memo } from 'react'
import { Upload, Send, Download, Trash, Copy, Scissors, 
    AlignLeft, AlignCenter, AlignRight, 
    Bold, Italic, Underline,
    Plus, Minus, Filter, ArrowUpDown,
    Save, FileSpreadsheet, Calculator, Trash2
} from 'lucide-react'
import axios from 'axios'
import { HotTable } from '@handsontable/react'
import type { CellChange, ChangeSource } from 'handsontable/common'
import type { Config } from 'handsontable/plugins/columnSorting'
import type { PredefinedMenuItemKey } from 'handsontable/plugins/contextMenu'
import type { HotTableClass } from '@handsontable/react'
import 'handsontable/dist/handsontable.full.css'
import '../styles/handsontable-dark.css'

import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { cn } from '../lib/utils'
import { AddColumnDialog, SortDialog, FilterDialog, CalculateDialog, SaveTableDialog, DeleteTableDialog } from './dialogs/TableDialogs'

type CommandType = 
    | 'transform' 
    | 'filter' 
    | 'sort' 
    | 'calculate' 
    | 'update_cell'
    | 'add_row'
    | 'delete_row'
    | 'add_column'
    | 'delete_column'
    | 'save'
    | 'delete'

interface Message {
    role: 'user' | 'assistant'
    content: string
    command?: {
        type: CommandType
        params: any
    }
}

interface ApiResponse {
    response: string
    status: string
    data?: any[][]
    file?: string
}

interface Dialog {
    id: string
    title: string
    messages: Message[]
    filename?: string
}

interface TableData {
    filename: string
    sheets: string[]
    currentSheet: string
    data: any[][]
    headers: string[]
}

interface CommandResult {
    status: 'success' | 'error'
    message: string
    data?: any[][]
    headers?: string[]
}

type SimpleContextMenuItem = {
    name: string
    callback: (...args: any[]) => void
}

type SimpleContextMenu = {
    items: {
        [key: string]: SimpleContextMenuItem
    }
}

interface ChatMessageProps {
    message: Message
}

const ChatMessage = memo(({ message }: ChatMessageProps) => (
    <div className={cn(
        "w-full flex",
        message.role === 'user' ? "justify-end" : "justify-start"
    )}>
        <div className={cn(
            "max-w-[80%] p-2 rounded-lg shadow-sm",
            message.role === 'user' ? "bg-primary" : "bg-secondary",
            "text-white"
        )}>
            <span className="text-sm">{message.content}</span>
        </div>
    </div>
))

ChatMessage.displayName = 'ChatMessage'

interface ChatMessageListProps {
    messages: Message[]
}

const ChatMessageList = memo(({ messages }: ChatMessageListProps) => (
    <>
        {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
        ))}
    </>
))

ChatMessageList.displayName = 'ChatMessageList'

interface CommandMessageProps {
    message: Message
}

const CommandMessage = memo(({ message }: CommandMessageProps) => (
    <div className={cn(
        "command-message w-full p-3 rounded-lg",
        message.role === 'user' ? "bg-blue-500/20" : "bg-secondary/40",
        "text-white border border-border/50"
    )}>
        <div className="flex items-start space-x-2">
            <div className="flex-1">
                <div className="mb-1 text-sm font-medium text-blue-400">
                    {message.role === 'user' ? 'Вы' : 'Ассистент'}
                </div>
                <div className="text-sm text-white/90">
                    {message.content}
                </div>
            </div>
        </div>
        {message.command && (
            <div className="mt-2 bg-background/40 p-2 rounded-md text-xs space-y-1">
                <div className="flex justify-between items-center">
                    <span className="text-blue-400">Команда: {message.command.type}</span>
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        message.role === 'assistant' 
                            ? "bg-green-500/30 text-green-400"
                            : "bg-yellow-500/30 text-yellow-400"
                    )}>
                        {message.role === 'assistant' ? 'Выполнено' : 'Ожидает'}
                    </span>
                </div>
                {Object.keys(message.command.params).length > 0 && (
                    <div className="text-white/70">
                        Параметры: {JSON.stringify(message.command.params)}
                    </div>
                )}
            </div>
        )}
    </div>
))

CommandMessage.displayName = 'CommandMessage'

interface CommandListProps {
    messages: Message[]
}

const CommandList = memo(({ messages }: CommandListProps) => (
    <div className="command-list space-y-4">
        {messages.map((message, index) => (
            <CommandMessage key={index} message={message} />
        ))}
    </div>
))

CommandList.displayName = 'CommandList'

interface TableActionsProps {
    tableData: TableData
    onSheetChange: (sheetName: string) => void
    onDownload: () => void
    onClear: () => void
}

const TableActions = memo(({ tableData, onSheetChange, onDownload, onClear }: TableActionsProps) => (
    <div className="h-10 min-h-10 py-1 border-b border-border">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">TableExecutor</h2>
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground truncate">
                    {tableData.filename}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDownload}
                >
                    <Download className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
        </div>
    </div>
))

TableActions.displayName = 'TableActions'

interface TableContentProps {
    tableData: TableData
    hotTableRef: React.RefObject<HotTableClass>
    settings: any
    onSheetChange: (sheetName: string) => void
}

const TableContent = memo(({ tableData, hotTableRef, settings, onSheetChange }: TableContentProps) => (
    <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center p-2 bg-secondary">
            <span className="text-white mr-2">Sheet:</span>
            <select
                className="bg-background text-white px-2 py-1 rounded text-sm"
                value={tableData.currentSheet}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onSheetChange(e.target.value)}
            >
                {tableData.sheets.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                ))}
            </select>
        </div>
        <div className="flex-1 overflow-auto relative">
            <HotTable
                ref={hotTableRef}
                data={tableData.data}
                colHeaders={tableData.headers}
                rowHeaders={true}
                width="100%"
                height="100%"
                licenseKey="non-commercial-and-evaluation"
                className="htDarkTheme"
                {...settings}
            />
        </div>
    </div>
))

TableContent.displayName = 'TableContent'

interface FileUploadProps {
    fileInputRef: React.RefObject<HTMLInputElement>
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const FileUploadButton = memo(({ fileInputRef, onFileUpload }: FileUploadProps) => (
    <div>
        <Input
            type="file"
            multiple
            onChange={onFileUpload}
            accept=".xlsx"
            className="hidden"
            ref={fileInputRef}
        />
        <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
        >
            <Upload className="h-4 w-4 mr-2" />
            Upload Table
        </Button>
    </div>
))

FileUploadButton.displayName = 'FileUploadButton'

interface CommandTextareaProps {
    input: string
    onInputChange: (value: string) => void
    onCommand: () => void
}

const CommandTextarea = memo(({ input, onInputChange, onCommand }: CommandTextareaProps) => (
    <Textarea
        value={input}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onInputChange(e.target.value)}
        placeholder="Enter command for table manipulation..."
        className="flex-1 min-h-[40px] max-h-[40px] bg-secondary text-white"
        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onCommand()
            }
        }}
    />
))

CommandTextarea.displayName = 'CommandTextarea'

interface ExecuteButtonProps {
    onCommand: () => void
}

const ExecuteButton = memo(({ onCommand }: ExecuteButtonProps) => (
    <Button
        size="sm"
        onClick={onCommand}
    >
        <Send className="h-4 w-4 mr-2" />
        Execute
    </Button>
))

ExecuteButton.displayName = 'ExecuteButton'

interface CommandInputProps extends FileUploadProps, CommandTextareaProps {
    onCommand: () => void
}

const CommandInput = memo(({ 
    input, 
    onInputChange, 
    onCommand, 
    fileInputRef, 
    onFileUpload 
}: CommandInputProps) => (
    <div className="flex items-center space-x-2 p-2">
        <FileUploadButton 
            fileInputRef={fileInputRef}
            onFileUpload={onFileUpload}
        />
        <CommandTextarea
            input={input}
            onInputChange={onInputChange}
            onCommand={onCommand}
        />
        <ExecuteButton onCommand={onCommand} />
    </div>
))

CommandInput.displayName = 'CommandInput'

interface TableToolbarProps {
    onSave: () => void
    onDelete: () => void
    onAddRow: () => void
    onDeleteRow: () => void
    onAddColumn: () => void
    onDeleteColumn: () => void
    onSort: () => void
    onFilter: () => void
    onCalculate: () => void
    disabled: boolean
}

const TableToolbar = memo(({ 
    onSave, onDelete, onAddRow, onDeleteRow,
    onAddColumn, onDeleteColumn, onSort, onFilter,
    onCalculate, disabled 
}: TableToolbarProps) => (
    <div className="flex flex-col border-b border-border bg-card">
        {/* Верхняя панель */}
        <div className="flex items-center p-2 space-x-2 border-b border-border bg-secondary">
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button variant="ghost" size="sm" disabled={disabled} onClick={onSave} className="hover:bg-primary/20">
                    <Save className="h-4 w-4 text-blue-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} onClick={onDelete} className="hover:bg-destructive/20">
                    <Trash className="h-4 w-4 text-red-400" />
                </Button>
            </div>
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <Copy className="h-4 w-4 text-green-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <Scissors className="h-4 w-4 text-yellow-400" />
                </Button>
            </div>
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <Bold className="h-4 w-4 text-purple-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <Italic className="h-4 w-4 text-purple-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <Underline className="h-4 w-4 text-purple-400" />
                </Button>
            </div>
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <AlignLeft className="h-4 w-4 text-orange-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <AlignCenter className="h-4 w-4 text-orange-400" />
                </Button>
                <Button variant="ghost" size="sm" disabled={disabled} className="hover:bg-primary/20">
                    <AlignRight className="h-4 w-4 text-orange-400" />
                </Button>
            </div>
        </div>

        {/* Нижняя панель */}
        <div className="flex items-center p-2 space-x-2 bg-secondary">
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onAddRow}
                    className="hover:bg-primary/20 text-blue-400"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Строка
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onDeleteRow}
                    className="hover:bg-destructive/20 text-red-400"
                >
                    <Minus className="h-4 w-4 mr-1" />
                    Строка
                </Button>
            </div>
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onAddColumn}
                    className="hover:bg-primary/20 text-blue-400"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Столбец
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onDeleteColumn}
                    className="hover:bg-destructive/20 text-red-400"
                >
                    <Minus className="h-4 w-4 mr-1" />
                    Столбец
                </Button>
            </div>
            <div className="flex items-center space-x-1 pr-2 border-r border-border/50">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onSort}
                    className="hover:bg-primary/20 text-yellow-400"
                >
                    <ArrowUpDown className="h-4 w-4 mr-1" />
                    Сортировка
                </Button>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onFilter}
                    className="hover:bg-primary/20 text-yellow-400"
                >
                    <Filter className="h-4 w-4 mr-1" />
                    Фильтр
                </Button>
            </div>
            <div className="flex items-center space-x-1">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onCalculate}
                    className="hover:bg-primary/20 text-green-400"
                >
                    <Calculator className="h-4 w-4 mr-1" />
                    Вычислить
                </Button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-1">
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={disabled} 
                    onClick={onSave}
                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50"
                >
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Скачать Excel
                </Button>
            </div>
        </div>
    </div>
))

TableToolbar.displayName = 'TableToolbar'

export default function TableExecutor() {
    const [dialogs, setDialogs] = useState<Dialog[]>([])
    const [currentDialogId, setCurrentDialogId] = useState<string>('')
    const [input, setInput] = useState('')
    const [files, setFiles] = useState<File[]>([])
    const [tableData, setTableData] = useState<TableData | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hotTableRef = useRef<HotTableClass>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
    const [cellContent, setCellContent] = useState('')
    const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false)
    const [isSortDialogOpen, setIsSortDialogOpen] = useState(false)
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
    const [isCalculateDialogOpen, setIsCalculateDialogOpen] = useState(false)
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    useEffect(() => {
        const firstDialog: Dialog = {
            id: Date.now().toString(),
            title: 'New Dialog',
            messages: []
        }
        setDialogs([firstDialog])
        setCurrentDialogId(firstDialog.id)
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [dialogs])

    const handleSheetChange = async (sheetName: string) => {
        try {
            const response = await axios.post<Omit<TableData, 'filename' | 'sheets' | 'currentSheet'>>(
                'http://localhost:8000/get-sheet-data',
                { sheet_name: sheetName }
            )

            setTableData(prev => prev ? {
                ...prev,
                currentSheet: sheetName,
                data: response.data.data || [],
                headers: response.data.headers || []
            } : null)
        } catch (error) {
            console.error('Error changing sheet:', error)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        if (selectedFiles.length > 15) {
            alert('Maximum 15 files allowed')
            return
        }
        const validFiles = selectedFiles.filter(file => {
            if (!file.name.endsWith('.xlsx')) {
                alert(`File ${file.name} is not an Excel file`)
                return false
            }
            return true
        })
        setFiles(validFiles)

        if (validFiles.length > 0) {
            const formData = new FormData()
            formData.append('file', validFiles[0])
            
            try {
                const response = await axios.post<TableData>('http://localhost:8000/upload', formData)
                setTableData(response.data)

                const newDialog: Dialog = {
                    id: Date.now().toString(),
                    title: response.data.filename,
                    messages: [],
                    filename: response.data.filename
                }
                setDialogs(prev => [...prev, newDialog])
                setCurrentDialogId(newDialog.id)
            } catch (error) {
                console.error('Error uploading file:', error)
            }
        }
    }

    const handleDownloadFile = async () => {
        try {
            const response = await axios.get<Blob>('http://localhost:8000/download-current', {
                responseType: 'blob'
            })
            
            const url = window.URL.createObjectURL(response.data)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', tableData?.filename || 'table.xlsx')
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Error downloading file:', error)
        }
    }

    const handleClearData = async () => {
        try {
            await axios.post('http://localhost:8000/clear-data')
            setTableData(null)
            setFiles([])
        } catch (error) {
            console.error('Error clearing data:', error)
        }
    }

    const handleCommand = async () => {
        if (!input.trim()) return
        if (!tableData) return

        const userMessage: Message = {
            role: 'user',
            content: input,
            command: {
                type: 'update_cell',
                params: {}
            }
        }

        setInput('')
        setMessages(prev => [...prev, userMessage])

        try {
            const formData = new FormData()
            formData.append('command', input)
            formData.append('sheet_name', tableData.currentSheet)
            formData.append('current_data', JSON.stringify(tableData.data))

            const response = await axios.post<CommandResult>(
                'http://localhost:8000/execute-command',
                formData
            )

            const assistantMessage: Message = {
                role: 'assistant',
                content: response.data.message,
                command: response.data.status === 'success' && response.data.data ? {
                    type: 'update_cell',
                    params: { data: response.data.data }
                } : undefined
            }

            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data || prev.data
                } : null)
            }

            setMessages(prev => [...prev, assistantMessage])

        } catch (error) {
            console.error('Error executing command:', error)
            const errorMessage: Message = {
                role: 'assistant',
                content: 'Произошла ошибка при выполнении команды. Пожалуйста, попробуйте снова.',
                command: {
                    type: 'update_cell',
                    params: {}
                }
            }
            setMessages(prev => [...prev, errorMessage])
        }
    }

    const handleDeleteDialog = (e: React.MouseEvent<HTMLButtonElement>, dialogId: string) => {
        e.stopPropagation()
        const newDialogs = dialogs.filter(d => d.id !== dialogId)
        setDialogs(newDialogs)
        if (currentDialogId === dialogId) {
            setCurrentDialogId(newDialogs[0]?.id || '')
            const dialog = dialogs.find(d => d.id === dialogId)
            if (dialog?.filename === tableData?.filename) {
                handleClearData()
            }
        }
    }

    const handleCellChange = async (changes: CellChange[] | null, source: ChangeSource) => {
        if (!changes || !tableData) return
        
        for (const change of changes) {
            const [row, col, oldValue, newValue] = change
            
            try {
                const formData = new FormData()
                formData.append('row', row.toString())
                formData.append('col', col.toString())
                formData.append('value', newValue?.toString() || '')
                formData.append('sheet_name', tableData.currentSheet)
                
                const response = await axios.post<CommandResult>(
                    'http://localhost:8000/update-cell',
                    formData
                )
                
                if (response.data.status === 'success' && response.data.data) {
                    setTableData(prev => prev ? {
                        ...prev,
                        data: response.data.data || prev.data
                    } : null)
                    
                    const message: Message = {
                        role: 'assistant',
                        content: `Ячейка обновлена: [${row}, ${col}] с "${oldValue}" на "${newValue}"`,
                        command: {
                            type: 'update_cell',
                            params: { row, col, value: newValue }
                        }
                    }
                    setMessages(prev => [...prev, message])
                } else {
                    throw new Error(response.data.message || 'Ошибка обновления ячейки')
                }
            } catch (error) {
                console.error('Error updating cell:', error)
                const errorMessage: Message = {
                    role: 'assistant',
                    content: 'Произошла ошибка при обновлении ячейки. Пожалуйста, попробуйте снова.',
                    command: {
                        type: 'update_cell',
                        params: { row, col, value: oldValue }
                    }
                }
                setMessages(prev => [...prev, errorMessage])
                
                // Восстанавливаем старое значение в таблице
                const hotInstance = (hotTableRef.current as any)?.hotInstance
                if (hotInstance) {
                    hotInstance.setDataAtCell(row, col, oldValue)
                }
            }
        }
    }

    const handleAddRow = async (index?: number) => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/add-row',
                {
                    sheet_name: tableData.currentSheet,
                    index: index
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: 'Добавлена новая строка',
                    command: {
                        type: 'add_row',
                        params: { index }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error adding row:', error)
        }
    }

    const handleDeleteRow = async (index?: number) => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/delete-row',
                {
                    sheet_name: tableData.currentSheet,
                    index: index
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: 'Строка удалена',
                    command: {
                        type: 'delete_row',
                        params: { index }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error deleting row:', error)
        }
    }

    const handleAddColumn = async (name: string) => {
        if (!tableData) return
        
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/add-column',
                {
                    sheet_name: tableData.currentSheet,
                    name: name
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!,
                    headers: [...prev.headers, name]
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: `Добавлен столбец "${name}"`,
                    command: {
                        type: 'add_column',
                        params: { name }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error adding column:', error)
        }
    }

    const handleDeleteColumn = async (index?: number) => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/delete-column',
                {
                    sheet_name: tableData.currentSheet,
                    index: index
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!,
                    headers: prev.headers.filter((_, i) => i !== index)
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: 'Столбец удален',
                    command: {
                        type: 'delete_column',
                        params: { index }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error deleting column:', error)
        }
    }

    const handleSort = async (column: number, order: 'asc' | 'desc') => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/sort',
                {
                    sheet_name: tableData.currentSheet,
                    column: column,
                    order: order
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: `Таблица отсортирована по столбцу ${column} (${order})`,
                    command: {
                        type: 'sort',
                        params: { column, order }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error sorting:', error)
        }
    }

    const handleFilter = async (column: number, value: string) => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/filter',
                {
                    sheet_name: tableData.currentSheet,
                    column: column,
                    value: value
                }
            )
            if (response.data.status === 'success' && response.data.data) {
                setTableData(prev => prev ? {
                    ...prev,
                    data: response.data.data!
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: `Применен фильтр: столбец ${column} = "${value}"`,
                    command: {
                        type: 'filter',
                        params: { column, value }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error filtering:', error)
        }
    }

    const handleCalculate = async (formula: string) => {
        if (!tableData) return
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/calculate',
                {
                    sheet_name: tableData.currentSheet,
                    formula: formula
                }
            )
            if (response.data.status === 'success') {
                const result = response.data.response
                const newData = [...tableData.data]
                newData[selectedCell?.row || 0][selectedCell?.col || 0] = String(result)
                setTableData(prev => prev ? {
                    ...prev,
                    data: newData
                } : null)
                const message: Message = {
                    role: 'assistant',
                    content: `Результат вычисления: ${result}`,
                    command: {
                        type: 'calculate',
                        params: { formula, result }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error calculating:', error)
        }
    }

    const handleSaveTable = async () => {
        try {
            const response = await axios.post<ApiResponse>(
                'http://localhost:8000/save-table',
                {
                    sheet_name: tableData?.currentSheet,
                    data: tableData?.data
                }
            )
            if (response.data.status === 'success') {
                const message: Message = {
                    role: 'assistant',
                    content: 'Таблица успешно сохранена',
                    command: {
                        type: 'save',
                        params: { filename: response.data.file }
                    }
                }
                setMessages(prev => [...prev, message])
            }
        } catch (error) {
            console.error('Error saving table:', error)
        }
    }

    const handleDeleteTable = async () => {
        if (window.confirm('Вы уверены, что хотите удалить таблицу?')) {
            try {
                await axios.post('http://localhost:8000/delete-table', {
                    sheet_name: tableData?.currentSheet
                })
                setTableData(null)
                const message: Message = {
                    role: 'assistant',
                    content: 'Таблица удалена',
                    command: {
                        type: 'delete',
                        params: {}
                    }
                }
                setMessages(prev => [...prev, message])
            } catch (error) {
                console.error('Error deleting table:', error)
            }
        }
    }

    const getTableSettings = (tableData: TableData) => {
        const contextMenu: SimpleContextMenu = {
            items: {
                'row_above': {
                    name: 'Insert row above',
                    callback: () => handleAddRow()
                },
                'row_below': {
                    name: 'Insert row below',
                    callback: () => handleAddRow()
                },
                'remove_row': {
                    name: 'Remove row',
                    callback: (key: string, selection: { start: { row: number }, end: { row: number } }[]) => {
                        const [start, end] = selection[0].start.row <= selection[0].end.row 
                            ? [selection[0].start.row, selection[0].end.row]
                            : [selection[0].end.row, selection[0].start.row]
                        
                        for (let row = start; row <= end; row++) {
                            handleDeleteRow(row)
                        }
                    }
                },
                'col_left': {
                    name: 'Insert column left',
                    callback: () => {
                        const columnName = prompt('Enter column name:')
                        if (columnName) {
                            handleAddColumn(columnName)
                        }
                    }
                },
                'col_right': {
                    name: 'Insert column right',
                    callback: () => {
                        const columnName = prompt('Enter column name:')
                        if (columnName) {
                            handleAddColumn(columnName)
                        }
                    }
                },
                'remove_col': {
                    name: 'Remove column',
                    callback: (key: string, selection: { start: { col: number } }[]) => {
                        const col = selection[0].start.col
                        const columnName = tableData.headers[col]
                        if (columnName) {
                            handleDeleteColumn(col)
                        }
                    }
                }
            }
        }

        return {
            autoColumnSize: false,
            autoRowSize: false,
            stretchH: 'none',
            wordWrap: true,
            rowHeights: 30,
            colWidths: 200,
            viewportColumnRenderingOffset: 5,
            viewportRowRenderingOffset: 10,
            renderAllRows: false,
            fixedRowsTop: 0,
            fixedColumnsLeft: 0,
            manualColumnResize: true,
            manualRowResize: true,
            outsideClickDeselects: false,
            columnSorting: true,
            filters: true,
            dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'] as PredefinedMenuItemKey[],
            manualColumnMove: true,
            afterChange: handleCellChange,
            afterColumnSort: handleSort,
            afterFilter: handleFilter,
            contextMenu
        }
    }

    return (
        <div className="flex h-screen max-h-screen overflow-hidden" data-testid="table-chat-container">
            {/* Левая панель с диалогами */}
            <div className="w-64 bg-secondary p-2 border-r border-border">
                <div className="flex flex-col space-y-2 h-full overflow-auto">
                    {dialogs.map(dialog => (
                        <div 
                            key={dialog.id}
                            className={cn(
                                "flex justify-between items-center p-2 rounded cursor-pointer",
                                currentDialogId === dialog.id ? "bg-primary/80" : "hover:bg-primary/10",
                                "transition-colors duration-200"
                            )}
                            onClick={() => setCurrentDialogId(dialog.id)}
                        >
                            <span className="text-sm text-white truncate flex-1">
                                {dialog.filename || dialog.title}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteDialog(e, dialog.id)}
                                className="ml-2 hover:bg-destructive/20"
                            >
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                            const newDialog: Dialog = {
                                id: Date.now().toString(),
                                title: 'New Dialog',
                                messages: []
                            }
                            setDialogs(prev => [...prev, newDialog])
                            setCurrentDialogId(newDialog.id)
                        }}
                    >
                        New Dialog
                    </Button>
                </div>
            </div>

            {/* Основной контент */}
            <div className="flex-1 flex flex-col h-screen">
                <div className="bg-background rounded-none h-full flex flex-col">
                    {/* Заголовок и действия с таблицей */}
                    {tableData && (
                        <>
                            <TableActions
                                tableData={tableData}
                                onSheetChange={handleSheetChange}
                                onDownload={handleDownloadFile}
                                onClear={handleClearData}
                            />
                            
                            {/* Панель инструментов Excel */}
                            <TableToolbar
                                onSave={() => setIsSaveDialogOpen(true)}
                                onDelete={() => setIsDeleteDialogOpen(true)}
                                onAddRow={() => handleAddRow()}
                                onDeleteRow={() => handleDeleteRow()}
                                onAddColumn={() => setIsAddColumnDialogOpen(true)}
                                onDeleteColumn={() => handleDeleteColumn()}
                                onSort={() => setIsSortDialogOpen(true)}
                                onFilter={() => setIsFilterDialogOpen(true)}
                                onCalculate={() => setIsCalculateDialogOpen(true)}
                                disabled={!tableData}
                            />
                            
                            {/* Область с таблицей */}
                            <div className="flex-1 min-h-0 flex flex-col">
                                <TableContent
                                    tableData={tableData}
                                    hotTableRef={hotTableRef}
                                    settings={getTableSettings(tableData)}
                                    onSheetChange={handleSheetChange}
                                />
                            </div>
                        </>
                    )}

                    {/* Чат и команды */}
                    <div className="h-[300px] border-t border-border/50 flex flex-col bg-card/50">
                        {/* История сообщений */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
                            <CommandList messages={messages} />
                        </div>

                        {/* Панель ввода */}
                        <div className="p-4 border-t border-border/50 bg-card">
                            <div className="flex items-center space-x-4">
                                <FileUploadButton
                                    fileInputRef={fileInputRef}
                                    onFileUpload={handleFileUpload}
                                />
                                <div className="flex-1 flex items-center space-x-2">
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Введите команду для работы с таблицей..."
                                        className="min-h-[40px] max-h-[120px] resize-none bg-background/50 text-white"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCommand();
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={handleCommand}
                                        disabled={!input.trim() || !tableData}
                                        className="shrink-0 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                                    >
                                        <Send className="h-4 w-4 mr-2" />
                                        Выполнить
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddColumnDialog
                open={isAddColumnDialogOpen}
                onOpenChange={setIsAddColumnDialogOpen}
                onConfirm={handleAddColumn}
            />
            <SortDialog
                open={isSortDialogOpen}
                onOpenChange={setIsSortDialogOpen}
                onConfirm={handleSort}
            />
            <FilterDialog
                open={isFilterDialogOpen}
                onOpenChange={setIsFilterDialogOpen}
                onConfirm={handleFilter}
            />
            <CalculateDialog
                open={isCalculateDialogOpen}
                onOpenChange={setIsCalculateDialogOpen}
                onConfirm={handleCalculate}
            />
            <SaveTableDialog
                open={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                onConfirm={handleSaveTable}
            />
            <DeleteTableDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                onConfirm={handleDeleteTable}
            />
        </div>
    )
} 