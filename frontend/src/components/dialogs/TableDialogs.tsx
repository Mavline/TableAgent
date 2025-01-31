import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface AddColumnDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (name: string) => void
}

export function AddColumnDialog({ open, onOpenChange, onConfirm }: AddColumnDialogProps) {
    const [name, setName] = useState('')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Добавить столбец</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Введите название столбца"
                        className="w-full"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm(name)
                            setName('')
                            onOpenChange(false)
                        }}
                        disabled={!name.trim()}
                    >
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface SortDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (column: number, order: 'asc' | 'desc') => void
}

export function SortDialog({ open, onOpenChange, onConfirm }: SortDialogProps) {
    const [column, setColumn] = useState('')
    const [order, setOrder] = useState<'asc' | 'desc'>('asc')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Сортировка</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input
                        type="number"
                        value={column}
                        onChange={(e) => setColumn(e.target.value)}
                        placeholder="Номер столбца"
                        className="w-full"
                    />
                    <div className="flex space-x-4">
                        <Button
                            variant={order === 'asc' ? 'default' : 'outline'}
                            onClick={() => setOrder('asc')}
                            className="flex-1"
                        >
                            По возрастанию
                        </Button>
                        <Button
                            variant={order === 'desc' ? 'default' : 'outline'}
                            onClick={() => setOrder('desc')}
                            className="flex-1"
                        >
                            По убыванию
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm(parseInt(column), order)
                            setColumn('')
                            onOpenChange(false)
                        }}
                        disabled={!column.trim() || isNaN(parseInt(column))}
                    >
                        Сортировать
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface FilterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (column: number, value: string) => void
}

export function FilterDialog({ open, onOpenChange, onConfirm }: FilterDialogProps) {
    const [column, setColumn] = useState('')
    const [value, setValue] = useState('')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Фильтр</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input
                        type="number"
                        value={column}
                        onChange={(e) => setColumn(e.target.value)}
                        placeholder="Номер столбца"
                        className="w-full"
                    />
                    <Input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Значение для фильтрации"
                        className="w-full"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm(parseInt(column), value)
                            setColumn('')
                            setValue('')
                            onOpenChange(false)
                        }}
                        disabled={!column.trim() || !value.trim() || isNaN(parseInt(column))}
                    >
                        Применить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface CalculateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: (formula: string) => void
}

export function CalculateDialog({ open, onOpenChange, onConfirm }: CalculateDialogProps) {
    const [formula, setFormula] = useState('')

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Вычисление</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Input
                        value={formula}
                        onChange={(e) => setFormula(e.target.value)}
                        placeholder="Введите формулу"
                        className="w-full"
                    />
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm(formula)
                            setFormula('')
                            onOpenChange(false)
                        }}
                        disabled={!formula.trim()}
                    >
                        Вычислить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface SaveTableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function SaveTableDialog({ open, onOpenChange, onConfirm }: SaveTableDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Сохранить таблицу</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p>Вы уверены, что хотите сохранить текущую таблицу?</p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm()
                            onOpenChange(false)
                        }}
                    >
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface DeleteTableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}

export function DeleteTableDialog({ open, onOpenChange, onConfirm }: DeleteTableDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Удалить таблицу</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-destructive">Это действие нельзя отменить. Вы уверены?</p>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            onConfirm()
                            onOpenChange(false)
                        }}
                    >
                        Удалить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 