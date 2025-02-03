'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/../lib/supabaseClient';
import Image from 'next/image';

interface Tyre {
  id: number;
  tyre_width: string;
  ratio: string;
  rim: string;
  created_at: string;
}

export default function Home() {
  // Store tyres as objects from Supabase
  const [tyres, setTyres] = useState<Tyre[]>([]);
  // Form states
  const [tyreWidth, setTyreWidth] = useState('');
  const [ratio, setRatio] = useState('');
  const [rim, setRim] = useState('');
  const [error, setError] = useState('');

  // Search states
  const [searchWidth, setSearchWidth] = useState('');
  const [searchRatio, setSearchRatio] = useState('');
  const [searchRim, setSearchRim] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Fetch tyres from Supabase on component mount
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

  // Add a new tyre entry to Supabase
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

    // Check for duplicates in the current state
    const exists = tyres.some(
      (tyre) =>
        tyre.tyre_width === tyreWidth &&
        tyre.ratio === ratio &&
        tyre.rim === rim
    );
    if (exists) {
      setError('Tyre number already exists.');
      return;
    }

    const { data, error: insertError } = await supabase
      .from('tyres')
      .insert([{ tyre_width: tyreWidth, ratio: ratio, rim: rim }])
      .select();

    if (insertError) {
      setError(insertError.message);
    } else if (data) {
      setTyres([...tyres, data[0]]);
      setTyreWidth('');
      setRatio('');
      setRim('');
      setError('');
    }
  };

  // Remove a tyre from Supabase
  const handleRemoveTyre = async (id: number) => {
    const { error } = await supabase.from('tyres').delete().eq('id', id);
    if (error) {
      console.error('Error deleting tyre:', error);
    } else {
      setTyres(tyres.filter((tyre) => tyre.id !== id));
    }
  };

  // Filter and sort tyres
  const filteredTyres = tyres.filter((tyre) => {
    let match = true;
    if (searchWidth) {
      match =
        match &&
        tyre.tyre_width.toLowerCase().includes(searchWidth.toLowerCase());
    }
    if (searchRatio) {
      match =
        match && tyre.ratio.toLowerCase().includes(searchRatio.toLowerCase());
    }
    if (searchRim) {
      match =
        match && tyre.rim.toLowerCase().includes(searchRim.toLowerCase());
    }
    return match;
  });

  filteredTyres.sort((a, b) => {
    const aNum = parseInt(a.tyre_width, 10);
    const bNum = parseInt(b.tyre_width, 10);
    return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/logo.png"
          alt="Logo"
          width={96}   // adjust width as needed (e.g., 96px for w-24)
          height={96}  // adjust height accordingly
          className="mx-auto"
        />
      </div>

      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Tyre Inventory
        </h1>

        {/* Form to add a new tyre */}
        <form onSubmit={handleAddTyre} className="space-y-4">
          <div className="flex flex-col">
            <label htmlFor="tyreWidth" className="mb-1 font-medium text-gray-800">
              Tyre Width:
            </label>
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
            <label htmlFor="ratio" className="mb-1 font-medium text-gray-800">
              Ratio:
            </label>
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
            <label htmlFor="rim" className="mb-1 font-medium text-gray-800">
              Rim (C for commercial):
            </label>
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

          {error && <p className="text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition-colors"
          >
            Add Tyre
          </button>
        </form>

        {/* Search fields */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="searchWidth" className="block mb-2 font-medium text-gray-800">
              Search Tyre Width:
            </label>
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
            <label htmlFor="searchRatio" className="block mb-2 font-medium text-gray-800">
              Search Ratio:
            </label>
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
            <label htmlFor="searchRim" className="block mb-2 font-medium text-gray-800">
              Search Rim:
            </label>
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

        {/* Sorting */}
        <div className="mt-6 flex items-center">
          <label htmlFor="sortOrder" className="mr-4 font-medium text-gray-800">
            Sort by Tyre Width:
          </label>
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
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800">
          Inventory
        </h2>
        {filteredTyres.length > 0 ? (
          <ul className="space-y-3">
            {filteredTyres.map((tyre) => (
              <li
                key={tyre.id}
                className="flex items-center justify-between border border-gray-200 rounded px-4 py-2"
              >
                <span className="text-gray-800">
                  {tyre.tyre_width}/{tyre.ratio}/{tyre.rim}
                </span>
                <button
                  onClick={() => handleRemoveTyre(tyre.id)}
                  className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1 rounded transition-colors"
                >
                  Remove
                </button>
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