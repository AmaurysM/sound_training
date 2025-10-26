/* eslint-disable @typescript-eslint/no-explicit-any */
export const customSelectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: '42px',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    borderRadius: '0.5rem',
    boxShadow: state.isFocused
      ? '0 0 0 2px rgba(59, 130, 246, 0.5)'
      : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#d1d5db' },
    transition: 'all 0.15s ease',
  }),
  valueContainer: (base: any) => ({ ...base, padding: '2px 12px' }),
  singleValue: (base: any) => ({ ...base, color: '#374151' }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#3b82f6'
      : state.isFocused
      ? '#eff6ff'
      : 'white',
    color: state.isSelected ? 'white' : '#374151',
    padding: '10px 12px',
    cursor: 'pointer',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: '#9ca3af',
    '&:hover': { color: '#6b7280' },
  }),
};