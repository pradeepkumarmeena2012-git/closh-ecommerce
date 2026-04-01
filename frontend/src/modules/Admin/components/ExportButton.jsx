import { FiDownload } from 'react-icons/fi';
import { generateCSV } from '../utils/adminHelpers';
import Button from './Button';
import toast from 'react-hot-toast';

const ExportButton = ({ data, headers, filename, className = '' }) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error('No data to export');
      return;
    }
    generateCSV(data, headers, filename);
  };

  return (
    <Button
      onClick={handleExport}
      variant="success"
      size="sm"
      icon={FiDownload}
      className={`flex-shrink-0 whitespace-nowrap ${className}`}
    >
      Export CSV
    </Button>
  );
};

export default ExportButton;

