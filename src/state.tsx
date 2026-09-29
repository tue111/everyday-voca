import { createContext, useContext } from 'react';
import type { Command, Reply, View } from '../shared/contracts';
export const AppContext=createContext<{view:View;run:(c:Command)=>Promise<Reply>;refresh:()=>Promise<void>}>(null!);
export const useApp=()=>useContext(AppContext);
