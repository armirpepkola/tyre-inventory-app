'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/../lib/supabaseClient';

interface Tyre {
  id: number;
  tyre_width: string;
  ratio: string;
  rim: string;
  quantity: number;
  created_at: string;
}

export default function Home() {
  // States for tyre inventory
  const [tyres, setTyres] = useState<Tyre[]>([]);
  
  // Form states for adding a tyre (or multiple tyres)
  const [tyreWidth, setTyreWidth] = useState('');
  const [ratio, setRatio] = useState('');
  const [rim, setRim] = useState('');
  const [quantity, setQuantity] = useState("1"); // New field for quantity
  const [error, setError] = useState('');

  // Search states for filtering the inventory
  const [searchWidth, setSearchWidth] = useState('');
  const [searchRatio, setSearchRatio] = useState('');
  const [searchRim, setSearchRim] = useState('');

  // Sorting state (by tyre width)
  const [sortOrder, setSortOrder] = useState('asc');

  // A state to hold removal quantity for each tyre record (keyed by tyre id)
  const [removeQuantities, setRemoveQuantities] = useState<{ [id: number]: number }>({});

  // Fetch tyres from Supabase on mount
  useEffect(() => {
    const fetchTyres = async () => {
      const { data, error } = await supabase.from('tyres').select('*');
      if (error) {
        console.error('Error fetching tyres:', error);
        return;
      }
      setTyres(data || []);
    };
    fetchTyres();
  }, []);

  // Validation functions:
  const validateTyreWidth = (value: string) => /^\d{3}$/.test(value);
  const validateRatio = (value: string) => /^\d{2}$/.test(value);
  const validateRim = (value: string) => /^[A-Za-z0-9]{2,3}$/.test(value);

  // Handler to add tyres (or update quantity if tyre already exists)
  const handleAddTyre = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateTyreWidth(tyreWidth)) {
      setError('Tyre Width must be exactly 3 digits.');
      return;
    }
    if (!validateRatio(ratio)) {
      setError('Ratio must be exactly 2 digits.');
      return;
    }
    if (!validateRim(rim)) {
      setError('Rim must be 2 to 3 alphanumeric characters.');
      return;
    }

    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    // Check if a tyre with the same specs already exists
    const existingTyre = tyres.find(
      tyre => tyre.tyre_width === tyreWidth && tyre.ratio === ratio && tyre.rim === rim
    );

    if (existingTyre) {
      // Update the existing record with the new quantity
      const newQuantity = existingTyre.quantity + quantityNumber;
      const { error: updateError } = await supabase
        .from('tyres')
        .update({ quantity: newQuantity })
        .eq('id', existingTyre.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setTyres(tyres.map(tyre => tyre.id === existingTyre.id ? { ...tyre, quantity: newQuantity } : tyre));
      setTyreWidth('');
      setRatio('');
      setRim('');
      setQuantity("1");
      setError('');
    } else {
      // Insert a new tyre record
      const { data, error: insertError } = await supabase
        .from('tyres')
        .insert([{ tyre_width: tyreWidth, ratio, rim, quantity: quantityNumber }])
        .select();
      if (insertError) {
        setError(insertError.message);
      } else if (data) {
        setTyres([...tyres, data[0]]);
        setTyreWidth('');
        setRatio('');
        setRim('');
        setQuantity("1");
        setError('');
      }
    }
  };

  // Handler to remove a given quantity from a tyre record
  const handleRemoveTyre = async (id: number, removeQty: number) => {
    const tyreToRemove = tyres.find(tyre => tyre.id === id);
    if (!tyreToRemove) return;

    if (removeQty >= tyreToRemove.quantity) {
      // Remove the entire record
      const { error } = await supabase.from('tyres').delete().eq('id', id);
      if (error) {
        console.error('Error deleting tyre:', error);
        return;
      }
      setTyres(tyres.filter(tyre => tyre.id !== id));
    } else {
      // Update the record with the reduced quantity
      const newQuantity = tyreToRemove.quantity - removeQty;
      const { error } = await supabase.from('tyres').update({ quantity: newQuantity }).eq('id', id);
      if (error) {
        console.error('Error updating tyre quantity:', error);
        return;
      }
      setTyres(tyres.map(tyre => tyre.id === id ? { ...tyre, quantity: newQuantity } : tyre));
    }
    // Reset the removal input for this record
    setRemoveQuantities(prev => ({ ...prev, [id]: 1 }));
  };

  // Filter tyres based on search fields
  const filteredTyres = tyres.filter(tyre => {
    let match = true;
    if (searchWidth) {
      match = match && tyre.tyre_width.toLowerCase().includes(searchWidth.toLowerCase());
    }
    if (searchRatio) {
      match = match && tyre.ratio.toLowerCase().includes(searchRatio.toLowerCase());
    }
    if (searchRim) {
      match = match && tyre.rim.toLowerCase().includes(searchRim.toLowerCase());
    }
    return match;
  });

  // Sort filtered tyres by tyre_width (numerically)
  filteredTyres.sort((a, b) => {
    const aNum = parseInt(a.tyre_width, 10);
    const bNum = parseInt(b.tyre_width, 10);
    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      {/* Logo */}
      <div className="mb-6">
        <Image src="/logo.png" alt="Logo" width={96} height={96} className="mx-auto" />
      </div>

      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Tyre Inventory</h1>

        {/* Form to add new tyre(s) */}
        <form onSubmit={handleAddTyre} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="tyreWidth" className="mb-1 font-medium text-gray-800">Tyre Width:</label>
            <input
              id="tyreWidth"
              type="text"
              value={tyreWidth}
              maxLength={3}
              onChange={(e) => setTyreWidth(e.target.value)}
              required
              placeholder="e.g., 205"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="ratio" className="mb-1 font-medium text-gray-800">Ratio:</label>
            <input
              id="ratio"
              type="text"
              value={ratio}
              maxLength={2}
              onChange={(e) => setRatio(e.target.value)}
              required
              placeholder="e.g., 55"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="rim" className="mb-1 font-medium text-gray-800">Rim (C for commercial):</label>
            <input
              id="rim"
              type="text"
              value={rim}
              maxLength={3}
              onChange={(e) => setRim(e.target.value)}
              required
              placeholder="e.g., 17C"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>

          {/* New input for quantity */}
          <div className="flex flex-col">
            <label htmlFor="quantity" className="mb-1 font-medium text-gray-800">Quantity to Add:</label>
            <input
              id="quantity"
              type="number"
              value={quantity}
              min="1"
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition-colors"
          >
            Add Tyre(s)
          </button>
        </form>

        {/* Search fields */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="searchWidth" className="block mb-2 font-medium text-gray-800">Search Tyre Width:</label>
            <input
              id="searchWidth"
              type="text"
              value={searchWidth}
              onChange={(e) => setSearchWidth(e.target.value)}
              placeholder="e.g., 205"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="searchRatio" className="block mb-2 font-medium text-gray-800">Search Ratio:</label>
            <input
              id="searchRatio"
              type="text"
              value={searchRatio}
              onChange={(e) => setSearchRatio(e.target.value)}
              placeholder="e.g., 55"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="searchRim" className="block mb-2 font-medium text-gray-800">Search Rim:</label>
            <input
              id="searchRim"
              type="text"
              value={searchRim}
              onChange={(e) => setSearchRim(e.target.value)}
              placeholder="e.g., 17C"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>
        </div>

        {/* Sorting dropdown */}
        <div className="mt-6 flex items-center">
          <label htmlFor="sortOrder" className="mr-4 font-medium text-gray-800">Sort by Tyre Width:</label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
          >
            <option value="asc">Smallest to Largest</option>
            <option value="desc">Largest to Smallest</option>
          </select>
        </div>

        {/* Inventory List */}
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800">Inventory</h2>
        {filteredTyres.length > 0 ? (
          <ul className="space-y-3">
            {filteredTyres.map((tyre) => (
              <li
                key={tyre.id}
                className="flex flex-col border border-gray-200 rounded px-4 py-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-800">
                    {tyre.tyre_width}/{tyre.ratio}/{tyre.rim}
                  </span>
                  <span className="text-gray-800 font-medium">Quantity: {tyre.quantity}</span>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    value={removeQuantities[tyre.id] || 1}
                    onChange={(e) =>
                      setRemoveQuantities(prev => ({
                        ...prev,
                        [tyre.id]: parseInt(e.target.value, 10) || 1
                      }))
                    }
                    className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                  />
                  <button
                    onClick={() => handleRemoveTyre(tyre.id, removeQuantities[tyre.id] || 1)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-800">No tyres found.</p>
        )}
      </div>
    </div>
  );
}