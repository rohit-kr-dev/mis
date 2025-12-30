'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface SearchableDropdownProps {
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  selectedIndicator?: string;
}

export default function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder,
  label,
  selectedIndicator
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term (prefix matching)
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().startsWith(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {value && <span className="text-green-600">✓</span>}
      </label>
      
      <div 
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white cursor-pointer flex justify-between items-center ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {value ? selectedOption?.name || value : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchTerm('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown 
            className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            size={16} 
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-100 ${
                    value === option.id ? 'bg-blue-500 text-white' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {option.name}
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-gray-500">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}