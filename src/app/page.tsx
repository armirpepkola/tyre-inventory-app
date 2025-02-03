'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/../lib/supabaseClient';

interface Tyre {
  id: number;
  tyre_width: string;
  ratio: string;
  rim: string;
  section: string;
  quantity: number;
  created_at: string;
}

export default function Home() {
  // Inventory state
  const [tyres, setTyres] = useState<Tyre[]>([]);
  
  // Form states for adding a tyre
  const [tyreWidth, setTyreWidth] = useState('');
  const [ratio, setRatio] = useState('');
  const [rim, setRim] = useState('');
  const [section, setSection] = useState('');
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState('');

  // Search states
  const [searchWidth, setSearchWidth] = useState('');
  const [searchRatio, setSearchRatio] = useState('');
  const [searchRim, setSearchRim] = useState('');
  const [searchSection, setSearchSection] = useState('');

  // Sorting state
  const [sortOrder, setSortOrder] = useState('asc');

  // Removal quantity state per tyre id
  const [removeQuantities, setRemoveQuantities] = useState<{ [id: number]: number }>({});

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

  // Validation functions
  const validateTyreWidth = (value: string) => /^\d{3}$/.test(value);
  const validateRatio = (value: string) => /^\d{2}$/.test(value);
  const validateRim = (value: string) => /^[A-Za-z0-9]{2,3}$/.test(value);
  // Validate that section is one letter followed by one digit (e.g., "A1")
  const validateSection = (value: string) => /^[A-Za-z]\d$/.test(value);

  const handleAddTyre = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all inputs
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
    if (!validateSection(section)) {
      setError('Section must be one letter followed by one number (e.g., A1).');
      return;
    }
    
    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    // Check if a tyre with the same specs (including section) exists
    const existingTyre = tyres.find(
      tyre =>
        tyre.tyre_width === tyreWidth &&
        tyre.ratio === ratio &&
        tyre.rim === rim &&
        tyre.section.toUpperCase() === section.toUpperCase()
    );

    if (existingTyre) {
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
    } else {
      // Insert a new tyre record
      const { data, error: insertError } = await supabase
        .from('tyres')
        .insert([
          { tyre_width: tyreWidth, ratio, rim, section: section.toUpperCase(), quantity: quantityNumber }
        ])
        .select();
      if (insertError) {
        setError(insertError.message);
        return;
      }
      if (data) {
        setTyres([...tyres, data[0]]);
      }
    }
    // Reset form fields
    setTyreWidth('');
    setRatio('');
    setRim('');
    setSection('');
    setQuantity("1");
    setError('');
  };

  const handleRemoveTyre = async (id: number, removeQty: number) => {
    const tyreToRemove = tyres.find(tyre => tyre.id === id);
    if (!tyreToRemove) return;

    if (removeQty >= tyreToRemove.quantity) {
      // Delete the record if removal quantity is equal or exceeds current quantity
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
    setRemoveQuantities(prev => ({ ...prev, [id]: 1 }));
  };

  // Filter tyres based on search criteria
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
    if (searchSection) {
      match = match && tyre.section.toLowerCase().includes(searchSection.toLowerCase());
    }
    return match;
  });

  // Sort filtered tyres by tyre_width numerically
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

          {/* New input for Section */}
          <div className="flex flex-col">
            <label htmlFor="section" className="mb-1 font-medium text-gray-800">Section (e.g., A1):</label>
            <input
              id="section"
              type="text"
              value={section}
              maxLength={2}
              onChange={(e) => setSection(e.target.value)}
              required
              placeholder="e.g., A1"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>

          {/* Input for Quantity */}
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="searchWidth" className="block mb-2 font-medium text-gray-800">Search Width:</label>
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
          <div>
            <label htmlFor="searchSection" className="block mb-2 font-medium text-gray-800">Search Section:</label>
            <input
              id="searchSection"
              type="text"
              value={searchSection}
              onChange={(e) => setSearchSection(e.target.value)}
              placeholder="e.g., A1"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
            />
          </div>
        </div>

        {/* Sorting dropdown */}
        <div className="mt-6 flex items-center">
          <label htmlFor="sortOrder" className="mr-4 font-medium text-gray-800">Sort by Width:</label>
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
          <div className="space-y-2">
            {filteredTyres.map((tyre) => (
              <div key={tyre.id} className="flex items-center justify-between p-3 bg-gray-100 rounded shadow">
                <div className="flex items-center space-x-4">
                  <span className="font-medium text-gray-800">
                    {tyre.tyre_width}/{tyre.ratio}/{tyre.rim}
                  </span>
                  <span className="text-gray-600">Section: {tyre.section}</span>
                  <span className="text-gray-800">Qty: {tyre.quantity}</span>
                </div>
                <div className="flex items-center space-x-2">
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
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-600 text-gray-900"
                  />
                  <button
                    onClick={() => handleRemoveTyre(tyre.id, removeQuantities[tyre.id] || 1)}
                    className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600 focus:outline-none"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-800">No tyres found.</p>
        )}
      </div>
    </div>
  );
}