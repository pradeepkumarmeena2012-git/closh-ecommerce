import { useState, useRef, useEffect, useMemo } from "react";
import { FiChevronDown, FiSearch, FiX, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const MultiSelect = ({
  value = [], // Should be an array of values
  onChange,
  options = [],
  placeholder = "Select options",
  className = "",
  disabled = false,
  searchable = true,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "object") return opt;
      return { value: opt, label: opt };
    });
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [normalizedOptions, searchQuery]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchable]);

  const toggleOption = (optionValue) => {
    const nextValue = Array.isArray(value) ? [...value] : [];
    const index = nextValue.indexOf(optionValue);
    
    if (index > -1) {
      nextValue.splice(index, 1);
    } else {
      nextValue.push(optionValue);
    }

    if (onChange) {
      onChange({
        target: {
          name: name || "",
          value: nextValue,
        },
      });
    }
  };

  const removeValue = (e, valToRemove) => {
    e.stopPropagation();
    const nextValue = value.filter(v => v !== valToRemove);
    if (onChange) {
      onChange({
        target: {
          name: name || "",
          value: nextValue,
        },
      });
    }
  };

  // Determine if dropdown should open upward
  const [openUpward, setOpenUpward] = useState(false);
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = Math.min(filteredOptions.length * 40 + 60, 300);
      setOpenUpward(spaceBelow < estimatedHeight && rect.top > spaceBelow);
    }
  }, [isOpen, filteredOptions.length]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] px-3 py-1.5 border border-gray-300 rounded-lg bg-white flex flex-wrap gap-1.5 items-center cursor-pointer transition-all ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "hover:border-primary-400"
        } ${isOpen ? "ring-2 ring-primary-500 border-primary-500" : ""}`}
      >
        {value.length === 0 ? (
          <span className="text-gray-500 text-sm">{placeholder}</span>
        ) : (
          value.map((v) => {
            const label = normalizedOptions.find(opt => opt.value === v)?.label || v;
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-xs font-semibold border border-primary-100"
              >
                {label}
                {!disabled && (
                  <FiX
                    className="cursor-pointer hover:text-primary-900"
                    onClick={(e) => removeValue(e, v)}
                  />
                )}
              </span>
            );
          })
        )}
        <div className="ml-auto pl-2 text-gray-400">
          <FiChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: openUpward ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: openUpward ? 10 : -10 }}
            className={`absolute z-[100] w-full bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden ${
              openUpward ? "bottom-full mb-2" : "top-full mt-1"
            }`}
          >
            {searchable && (
              <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="max-h-[200px] overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-gray-400 text-xs">No options found</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = value.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOption(opt.value);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary-50 text-primary-700" : "hover:bg-gray-50 text-gray-700"
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                      {isSelected && <FiCheck className="text-primary-600" size={14} />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MultiSelect;
