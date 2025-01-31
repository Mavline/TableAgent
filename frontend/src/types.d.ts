declare module '@handsontable/react' {
    import { Component } from 'react';
    import Handsontable from 'handsontable';
    
    export class HotTable extends Component<Handsontable.GridSettings> {}
    export class HotColumn extends Component<Handsontable.ColumnSettings> {}
    export type HotTableClass = HotTable;
}

declare module 'handsontable/plugins/columnSorting' {
    export interface Config {
        column: number;
        sortOrder: 'asc' | 'desc';
    }
}

declare module 'handsontable/plugins/contextMenu' {
    export type PredefinedMenuItemKey = 
        | 'row_above'
        | 'row_below'
        | 'col_left'
        | 'col_right'
        | 'remove_row'
        | 'remove_col'
        | 'undo'
        | 'redo'
        | 'make_read_only'
        | 'alignment'
        | 'cut'
        | 'copy'
        | 'freeze_column'
        | 'unfreeze_column'
        | 'borders'
        | 'commentsAddEdit'
        | 'commentsRemove'
        | 'add_child'
        | 'detach_from_parent'
        | 'hidden_columns_hide'
        | 'hidden_columns_show'
        | 'hidden_rows_hide'
        | 'hidden_rows_show'
        | 'filter_by_condition'
        | 'filter_by_value'
        | 'filter_action_bar';
}

declare module 'handsontable' {
    interface GridSettings {
        settings?: any;
        [key: string]: any;
    }
} 