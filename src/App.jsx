import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, X, Trash2, Calendar, Tag, CircleDollarSign, AlignLeft, Info, List, CalendarDays, PieChart, Filter, ChevronDown, ChevronUp, Plane, MapPin, ArrowLeft, Bed, FolderPlus } from 'lucide-react';

// --- Constants ---
const CATEGORIES = [
  '💼 Trabajo', '📈 Inversiones', '🏠 Vivienda', '🍽️ Alimentación', 
  '🚗 Transporte', '🎉 Ocio', '✈️ Viajes', '🏥 Salud', '💅 Estética', 
  '👕 Ropa', '📱 Suscripciones', '📦 Otros'
];

const TRIP_CATEGORIES = ['🚗 Transporte', '🎉 Ocio', '🛏️ Alojamiento', '📦 Otros'];

export default function App() {
  // Load initial state from localStorage
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('finanzas_transactions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error parsing localStorage data", e);
    }
    return [];
  });
  
  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Trips States
  const [trips, setTrips] = useState(() => {
    try {
      const saved = localStorage.getItem('finanzas_trips');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing trips data", e);
    }
    return [];
  });
  const [activeTripId, setActiveTripId] = useState(null);
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
  const [isAddTripTxModalOpen, setIsAddTripTxModalOpen] = useState(false);
  const [tripTxToDelete, setTripTxToDelete] = useState(null);
  const [tripToDelete, setTripToDelete] = useState(null);

  // Tabs & Filters
  const [currentTab, setCurrentTab] = useState('movimientos');
  const [filterType, setFilterType] = useState('todos');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [expandedMonth, setExpandedMonth] = useState(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('finanzas_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('finanzas_trips', JSON.stringify(trips));
  }, [trips]);

  // --- Calculations ---
  const { totalIngresos, totalGastos, saldoActual } = useMemo(() => {
    return transactions.reduce(
      (acc, curr) => {
        const amount = parseFloat(curr.importe) || 0;
        if (curr.tipo === 'ingreso') {
          acc.totalIngresos += amount;
          acc.saldoActual += amount;
        } else {
          acc.totalGastos += amount;
          acc.saldoActual -= amount;
        }
        return acc;
      },
      { totalIngresos: 0, totalGastos: 0, saldoActual: 0 }
    );
  }, [transactions]);

  // Filtered transactions for Movimientos Tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'todos' && tx.tipo !== filterType) return false;
      if (filterCategory !== 'todas' && tx.categoria !== filterCategory) return false;
      return true;
    });
  }, [transactions, filterType, filterCategory]);

  // Monthly summary data
  const monthlyData = useMemo(() => {
    const grouped = {};
    transactions.forEach(tx => {
      const date = new Date(tx.fecha);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthKey,
          label: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase()),
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          ingresos: 0,
          gastos: 0,
          balance: 0,
          categorias: {}
        };
      }
      const amount = parseFloat(tx.importe) || 0;
      if (tx.tipo === 'ingreso') {
        grouped[monthKey].ingresos += amount;
        grouped[monthKey].balance += amount;
      } else {
        grouped[monthKey].gastos += amount;
        grouped[monthKey].balance -= amount;
      }
      
      if (!grouped[monthKey].categorias[tx.categoria]) {
         grouped[monthKey].categorias[tx.categoria] = { ingresos: 0, gastos: 0 };
      }
      if (tx.tipo === 'ingreso') {
        grouped[monthKey].categorias[tx.categoria].ingresos += amount;
      } else {
        grouped[monthKey].categorias[tx.categoria].gastos += amount;
      }
    });
    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }, [transactions]);

  // Global Categories data
  const globalCategories = useMemo(() => {
    const catTotals = {};
    CATEGORIES.forEach(cat => catTotals[cat] = { ingresos: 0, gastos: 0, balance: 0 });
    transactions.forEach(tx => {
       const amount = parseFloat(tx.importe) || 0;
       if (tx.tipo === 'ingreso') {
         catTotals[tx.categoria].ingresos += amount;
         catTotals[tx.categoria].balance += amount;
       } else {
         catTotals[tx.categoria].gastos += amount;
         catTotals[tx.categoria].balance -= amount;
       }
    });
    // Sort by largest absolute impact
    return Object.entries(catTotals).sort((a, b) => Math.abs(b[1].balance) - Math.abs(a[1].balance));
  }, [transactions]);

  // Viajes Calculations
  const viajesGrandTotal = useMemo(() => {
    return trips.reduce((acc, trip) => {
      const tripBalance = (trip.transactions || []).reduce((tAcc, tx) => {
        const amount = parseFloat(tx.importe) || 0;
        return tx.tipo === 'ingreso' ? tAcc + amount : tAcc - amount;
      }, 0);
      return acc + tripBalance;
    }, 0);
  }, [trips]);

  const activeTrip = useMemo(() => trips.find(t => t.id === activeTripId), [trips, activeTripId]);

  // --- Actions ---
  const handleAddTransaction = (formData) => {
    const newTransaction = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      ...formData,
      createdAt: new Date().toISOString()
    };
    
    setTransactions(prev => {
      const updated = [newTransaction, ...prev];
      // Sort by date descending
      return updated.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    });
    setIsAddModalOpen(false);
  };

  const handleDeleteTransaction = () => {
    if (!transactionToDelete) return;
    setTransactions(prev => prev.filter(tx => tx.id !== transactionToDelete.id));
    setTransactionToDelete(null);
  };

  const handleAddTrip = (destino) => {
    const newTrip = { id: Date.now().toString(), destino, createdAt: new Date().toISOString(), transactions: [] };
    setTrips(prev => [newTrip, ...prev]);
    setIsAddTripModalOpen(false);
  };

  const handleAddTripTx = (formData) => {
    setTrips(prev => prev.map(trip => {
      if (trip.id === activeTripId) {
        const newTx = { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), ...formData, createdAt: new Date().toISOString() };
        const updatedTx = [newTx, ...(trip.transactions || [])].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return { ...trip, transactions: updatedTx };
      }
      return trip;
    }));
    setIsAddTripTxModalOpen(false);
  };

  const handleDeleteTripTx = () => {
    if (!tripTxToDelete || !activeTripId) return;
    setTrips(prev => prev.map(trip => {
      if (trip.id === activeTripId) {
        return { ...trip, transactions: trip.transactions.filter(tx => tx.id !== tripTxToDelete.id) };
      }
      return trip;
    }));
    setTripTxToDelete(null);
  };

  const handleDeleteTrip = () => {
    if (!tripToDelete) return;
    setTrips(prev => prev.filter(t => t.id !== tripToDelete.id));
    if (activeTripId === tripToDelete.id) {
      setActiveTripId(null);
    }
    setTripToDelete(null);
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-200">
      {/* App Container (Mobile constrained on large screens for app feel) */}
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative pb-24">
        
        {/* Header */}
        <header className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-md sticky top-0 z-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold tracking-tight">Mis Finanzas</h1>
            <div className="p-2 bg-slate-800 rounded-full">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          
          <div className="text-center mb-2">
            <p className="text-slate-400 text-sm font-medium mb-1">Saldo Actual</p>
            <h2 className={`text-4xl font-extrabold tracking-tighter ${saldoActual < 0 ? 'text-rose-400' : 'text-white'}`}>
              {saldoActual.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </h2>
          </div>
          
          {/* Dashboard Summary Cards */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-emerald-500/20 p-1.5 rounded-full">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Ingresos</span>
              </div>
              <p className="text-emerald-400 font-bold text-lg">
                {totalIngresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-rose-500/20 p-1.5 rounded-full">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                </div>
                <span className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Gastos</span>
              </div>
              <p className="text-rose-400 font-bold text-lg">
                {totalGastos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6 pb-24">
          
          {/* TAB 1: MOVIMIENTOS */}
          {currentTab === 'movimientos' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-lg font-bold text-slate-800">Movimientos</h3>
                  <span className="text-xs font-medium text-slate-500">{filteredTransactions.length} registros</span>
                </div>
                
                {/* Filters */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="todos">Tipo (Todos)</option>
                      <option value="ingreso">Ingresos</option>
                      <option value="gasto">Gastos</option>
                    </select>
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative flex-[1.5]">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-700 text-sm rounded-lg py-2 pl-3 pr-8 appearance-none focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                    >
                      <option value="todas">Categoría (Todas)</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="bg-slate-100 p-4 rounded-full mb-3">
                    <Info className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No se encontraron movimientos</p>
                  <p className="text-sm text-slate-400 mt-1">Prueba a añadir uno nuevo.</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <div className="bg-slate-100 p-4 rounded-full mb-3">
                    <Info className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">No hay coincidencias</p>
                  <p className="text-sm text-slate-400 mt-1">Prueba a cambiar los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((tx) => (
                    <div 
                      key={tx.id} 
                      className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`p-3 rounded-full shrink-0 ${tx.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {tx.tipo === 'ingreso' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-slate-800 truncate">{tx.concepto}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="truncate">{tx.categoria}</span>
                            <span>•</span>
                            <span>{new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className={`font-bold ${tx.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.tipo === 'ingreso' ? '+' : '-'}{parseFloat(tx.importe).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <button 
                          onClick={() => setTransactionToDelete(tx)}
                          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MENSUAL */}
          {currentTab === 'mensual' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen Mensual</h3>
              {monthlyData.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No hay datos mensuales todavía.</p>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((month) => {
                    const isExpanded = expandedMonth === month.monthKey;
                    return (
                      <div key={month.monthKey} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all">
                        {/* Month Header (Clickable) */}
                        <button 
                          onClick={() => setExpandedMonth(isExpanded ? null : month.monthKey)}
                          className="w-full p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-100 rounded-full text-slate-600">
                              <CalendarDays className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800 capitalize">{month.label}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold text-lg ${month.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {month.balance >= 0 ? '+' : ''}{month.balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </span>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-slate-50 bg-slate-50/50">
                            <div className="flex gap-4 mb-4 mt-4">
                              <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                                <span className="block text-xs font-medium text-slate-500 mb-1">Ingresos Totales</span>
                                <span className="font-bold text-emerald-600">{month.ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                              </div>
                              <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 text-center">
                                <span className="block text-xs font-medium text-slate-500 mb-1">Gastos Totales</span>
                                <span className="font-bold text-rose-600">{month.gastos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                              </div>
                            </div>
                            
                            <h4 className="text-sm font-bold text-slate-700 mb-2 px-1">Desglose por Categoría</h4>
                            <div className="space-y-2">
                              {Object.entries(month.categorias)
                                .sort((a, b) => (Math.abs(b[1].gastos) + Math.abs(b[1].ingresos)) - (Math.abs(a[1].gastos) + Math.abs(a[1].ingresos)))
                                .map(([cat, amounts]) => {
                                  if (amounts.ingresos === 0 && amounts.gastos === 0) return null;
                                  return (
                                    <div key={cat} className="flex justify-between items-center text-sm bg-white p-2.5 rounded-lg border border-slate-100">
                                      <span className="font-medium text-slate-700 truncate mr-2">{cat}</span>
                                      <div className="flex gap-3 text-xs">
                                        {amounts.ingresos > 0 && <span className="text-emerald-600 font-semibold">+{amounts.ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
                                        {amounts.gastos > 0 && <span className="text-rose-600 font-semibold">-{amounts.gastos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GLOBAL */}
          {currentTab === 'global' && (
            <div className="animate-in fade-in duration-300">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Balance General Histórico</h3>
              
              <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 shadow-md">
                <div className="text-center mb-4">
                  <span className="block text-sm text-slate-400 font-medium mb-1">Balance Histórico Total</span>
                  <span className={`text-3xl font-extrabold tracking-tight ${saldoActual < 0 ? 'text-rose-400' : 'text-white'}`}>
                    {saldoActual.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
                <div className="flex divide-x divide-slate-700 border-t border-slate-700 pt-4">
                  <div className="flex-1 text-center">
                    <span className="block text-xs text-slate-400 mb-1">Total Ingresos</span>
                    <span className="font-bold text-emerald-400">{totalIngresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <span className="block text-xs text-slate-400 mb-1">Total Gastos</span>
                    <span className="font-bold text-rose-400">{totalGastos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-3">Totales por Categoría</h3>
              <div className="space-y-2">
                {globalCategories.map(([cat, totals]) => {
                  if (totals.ingresos === 0 && totals.gastos === 0) return null;
                  return (
                    <div key={cat} className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 truncate pr-4">{cat}</span>
                      <div className="flex flex-col items-end shrink-0">
                        <span className={`font-bold ${totals.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {totals.balance >= 0 ? '+' : ''}{totals.balance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <div className="flex gap-2 text-[10px] mt-0.5 opacity-70">
                           {totals.ingresos > 0 && <span className="text-emerald-600">IN: {totals.ingresos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
                           {totals.gastos > 0 && <span className="text-rose-600">GA: {totals.gastos.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: VIAJES */}
          {currentTab === 'viajes' && (
            <div className="animate-in fade-in duration-300">
              {!activeTripId ? (
                <>
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Mis Viajes</h3>
                      <p className="text-xs text-slate-500">Cuentas independientes</p>
                    </div>
                  </div>
                  
                  {/* Global Viajes Balance */}
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 mb-6 shadow-md border border-indigo-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-indigo-200 font-medium">Balance Total Viajes</span>
                      <div className="bg-indigo-500/20 p-1.5 rounded-full">
                        <Plane className="w-4 h-4 text-indigo-300" />
                      </div>
                    </div>
                    <span className={`text-3xl font-extrabold tracking-tight ${viajesGrandTotal < 0 ? 'text-rose-400' : 'text-white'}`}>
                      {viajesGrandTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </span>
                    <p className="text-[10px] text-indigo-300 mt-2 opacity-80">*Este balance no afecta al resumen general.</p>
                  </div>

                  {trips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-100">
                      <div className="bg-indigo-100 p-4 rounded-full mb-3">
                        <FolderPlus className="w-6 h-6 text-indigo-400" />
                      </div>
                      <p className="text-slate-600 font-medium">Aún no hay viajes</p>
                      <p className="text-sm text-slate-400 mt-1">Crea una carpeta para tu próximo destino.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {trips.map(trip => {
                        const tripBalance = (trip.transactions || []).reduce((acc, tx) => {
                          const amount = parseFloat(tx.importe) || 0;
                          return tx.tipo === 'ingreso' ? acc + amount : acc - amount;
                        }, 0);
                        
                        return (
                          <div
                            key={trip.id}
                            onClick={() => setActiveTripId(trip.id)}
                            className="relative cursor-pointer bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all text-left flex flex-col h-full group"
                          >
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setTripToDelete(trip); 
                              }}
                              className="absolute top-2 right-2 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 z-10"
                              aria-label="Eliminar viaje"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-500 mb-3 group-hover:scale-110 transition-transform">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-800 truncate w-full mb-1 pr-6">{trip.destino}</span>
                            <span className={`font-bold mt-auto ${tripBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tripBalance >= 0 ? '+' : ''}{tripBalance.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">{(trip.transactions || []).length} movs.</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setActiveTripId(null)}
                    className="flex items-center gap-2 text-sm text-indigo-600 font-medium mb-4 hover:text-indigo-800 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver a Viajes
                  </button>
                  
                  {activeTrip && (
                    <>
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
                        <div className="overflow-hidden pr-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-slate-800 truncate">{activeTrip.destino}</h3>
                            <button 
                              onClick={() => setTripToDelete(activeTrip)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                              aria-label="Eliminar viaje"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">Carpeta de viaje</span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-slate-500 font-medium mb-0.5">Balance</p>
                          <span className={`text-xl font-bold ${
                            (activeTrip.transactions || []).reduce((acc, tx) => tx.tipo === 'ingreso' ? acc + parseFloat(tx.importe) : acc - parseFloat(tx.importe), 0) >= 0 
                            ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {((activeTrip.transactions || []).reduce((acc, tx) => tx.tipo === 'ingreso' ? acc + parseFloat(tx.importe) : acc - parseFloat(tx.importe), 0)).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-3">
                        <h4 className="text-sm font-bold text-slate-700">Movimientos del Viaje</h4>
                        <span className="text-xs text-slate-500">{(activeTrip.transactions || []).length} registros</span>
                      </div>

                      {(activeTrip.transactions || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-500 font-medium">Carpeta vacía</p>
                          <p className="text-sm text-slate-400 mt-1">Añade los gastos de este viaje.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeTrip.transactions.map((tx) => (
                            <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow group">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`p-2.5 rounded-full shrink-0 ${tx.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {tx.categoria === '🛏️ Alojamiento' ? <Bed className="w-4 h-4" /> : 
                                   tx.categoria === '🚗 Transporte' ? <Plane className="w-4 h-4" /> :
                                   tx.tipo === 'ingreso' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                </div>
                                <div className="overflow-hidden">
                                  <p className="font-semibold text-sm text-slate-800 truncate">{tx.concepto}</p>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="truncate">{tx.categoria}</span>
                                    <span>•</span>
                                    <span>{new Date(tx.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <span className={`font-bold text-sm ${tx.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {tx.tipo === 'ingreso' ? '+' : '-'}{parseFloat(tx.importe).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                               </span>
                                <button 
                                  onClick={() => setTripTxToDelete(tx)}
                                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </main>

        {/* Floating Action Button */}
        {(currentTab === 'movimientos' || currentTab === 'viajes') && (
          <button
            onClick={() => {
              if (currentTab === 'movimientos') setIsAddModalOpen(true);
              else if (currentTab === 'viajes' && !activeTripId) setIsAddTripModalOpen(true);
              else setIsAddTripTxModalOpen(true);
            }}
            className="fixed bottom-24 right-4 md:right-6 lg:right-auto lg:left-[calc(50%+150px)] bg-slate-900 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-800 active:scale-95 transition-all z-20"
            aria-label="Añadir"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-slate-100 pb-safe z-30 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-[72px]">
            <button 
              onClick={() => setCurrentTab('movimientos')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${currentTab === 'movimientos' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className={`w-5 h-5 ${currentTab === 'movimientos' ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] font-semibold">Movs.</span>
            </button>
            <button 
              onClick={() => setCurrentTab('mensual')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${currentTab === 'mensual' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <CalendarDays className={`w-5 h-5 ${currentTab === 'mensual' ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] font-semibold">Mensual</span>
            </button>
            <button 
              onClick={() => setCurrentTab('global')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${currentTab === 'global' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <PieChart className={`w-5 h-5 ${currentTab === 'global' ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] font-semibold">Global</span>
            </button>
            <button 
              onClick={() => setCurrentTab('viajes')}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${currentTab === 'viajes' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Plane className={`w-5 h-5 ${currentTab === 'viajes' ? 'stroke-[2.5px]' : ''}`} />
              <span className="text-[10px] font-semibold">Viajes</span>
            </button>
          </div>
        </nav>

        {/* Modals */}
        <TransactionModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onSave={handleAddTransaction} 
        />

        <ConfirmDeleteModal 
          isOpen={!!transactionToDelete}
          onClose={() => setTransactionToDelete(null)}
          onConfirm={handleDeleteTransaction}
          transaction={transactionToDelete}
        />

        <AddTripModal
          isOpen={isAddTripModalOpen}
          onClose={() => setIsAddTripModalOpen(false)}
          onSave={handleAddTrip}
        />

        <TripTransactionModal
          isOpen={isAddTripTxModalOpen}
          onClose={() => setIsAddTripTxModalOpen(false)}
          onSave={handleAddTripTx}
        />

        <ConfirmDeleteModal 
          isOpen={!!tripTxToDelete}
          onClose={() => setTripTxToDelete(null)}
          onConfirm={handleDeleteTripTx}
          transaction={tripTxToDelete}
        />

        <ConfirmDeleteTripModal
          isOpen={!!tripToDelete}
          onClose={() => setTripToDelete(null)}
          onConfirm={handleDeleteTrip}
          trip={tripToDelete}
        />

      </div>
    </div>
  );
}

// --- Component: Confirm Delete Trip Modal ---
function ConfirmDeleteTripModal({ isOpen, onClose, onConfirm, trip }) {
  if (!isOpen || !trip) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar carpeta de viaje?</h3>
        <p className="text-slate-500 text-sm mb-6">
          Estás a punto de eliminar el viaje <strong>"{trip.destino}"</strong> y sus <strong>{(trip.transactions || []).length}</strong> movimientos. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors shadow-md shadow-rose-500/20"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Component: Add Trip Modal ---
function AddTripModal({ isOpen, onClose, onSave }) {
  const [destino, setDestino] = useState('');

  useEffect(() => {
    if (isOpen) setDestino('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (destino.trim()) onSave(destino.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-500" /> Nuevo Viaje
          </h2>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Destino del Viaje</label>
            <input
              type="text"
              required
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Ej. Japón 2026, Escapada Rural..."
              autoFocus
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            Crear Carpeta
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Component: Trip Transaction Modal ---
function TripTransactionModal({ isOpen, onClose, onSave }) {
  const [tipo, setTipo] = useState('gasto');
  const [importe, setImporte] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState(TRIP_CATEGORIES[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      setTipo('gasto');
      setImporte('');
      setConcepto('');
      setCategoria(TRIP_CATEGORIES[0]);
      setFecha(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!importe || !concepto || !fecha) return;
    onSave({ tipo, importe: parseFloat(importe), concepto, categoria, fecha });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
          <h2 className="text-xl font-bold text-slate-800">Movimiento de Viaje</h2>
          <button type="button" onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl relative">
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${tipo === 'gasto' ? 'text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${tipo === 'ingreso' ? 'text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ingreso
            </button>
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${tipo === 'ingreso' ? 'translate-x-[calc(100%+4px)] border-emerald-100' : 'translate-x-0 border-rose-100'}`} />
          </div>

          {/* Importe & Concepto */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> Importe (€)</label>
            <input
              type="number" step="0.01" min="0.01" required value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2"><AlignLeft className="w-4 h-4" /> Concepto</label>
            <input
              type="text" required value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Ej. Billetes de avión, Hotel..."
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Fecha & Categoría */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2"><Calendar className="w-4 h-4" /> Fecha</label>
              <input
                type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2"><Tag className="w-4 h-4" /> Categoría</label>
              <select
                value={categoria} onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
              >
                {TRIP_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-4 rounded-xl text-white font-bold text-lg mt-6 shadow-md transition-all active:scale-[0.98] ${
              tipo === 'ingreso' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
            }`}
          >
            Guardar {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Component: Transaction Form Modal ---
function TransactionModal({ isOpen, onClose, onSave }) {
  const [tipo, setTipo] = useState('gasto');
  const [importe, setImporte] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIES[0]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTipo('gasto');
      setImporte('');
      setConcepto('');
      setCategoria(CATEGORIES[0]);
      setFecha(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!importe || !concepto || !fecha) return;
    
    onSave({
      tipo,
      importe: parseFloat(importe),
      concepto,
      categoria,
      fecha
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm sm:p-4">
      <div 
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Nuevo Movimiento</h2>
          <button onClick={onClose} className="p-2 bg-white text-slate-400 hover:text-slate-600 rounded-full shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Tipo (Ingreso / Gasto) Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl relative">
            <button
              type="button"
              onClick={() => setTipo('gasto')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${tipo === 'gasto' ? 'text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${tipo === 'ingreso' ? 'text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Ingreso
            </button>
            {/* Sliding background indicator */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${tipo === 'ingreso' ? 'translate-x-[calc(100%+4px)] border-emerald-100' : 'translate-x-0 border-rose-100'}`} 
            />
          </div>

          {/* Importe */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4" /> Importe (€)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="0.00"
                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</span>
            </div>
          </div>

          {/* Concepto */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Concepto
            </label>
            <input
              type="text"
              required
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Compra supermercado"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Fecha
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            {/* Categoría */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-4 rounded-xl text-white font-bold text-lg mt-6 shadow-md transition-all active:scale-[0.98] ${
              tipo === 'ingreso' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            Guardar {tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Component: Confirm Delete Modal ---
function ConfirmDeleteModal({ isOpen, onClose, onConfirm, transaction }) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar registro?</h3>
        <p className="text-slate-500 text-sm mb-6">
          Estás a punto de eliminar el {transaction.tipo} <strong>"{transaction.concepto}"</strong> por valor de <strong>{parseFloat(transaction.importe).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong>. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl transition-colors shadow-md shadow-rose-500/20"
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}