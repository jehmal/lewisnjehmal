import { StandardReference } from './references';

export interface TreeViewElement {
  id: string;
  name: string;
  children?: TreeViewElement[];
}

export interface ClauseTreeViewElement extends TreeViewElement {
  standardDoc?: string;
  standard?: StandardReference;
  isSelectable: boolean;
} 