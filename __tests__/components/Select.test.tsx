import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Select } from '@/components/ui/Select';

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('renders with label', () => {
    render(<Select label="Choose an option" options={options} />);
    expect(screen.getByLabelText('Choose an option')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(<Select label="Choose" options={options} />);
    const select = screen.getByLabelText('Choose') as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
  });

  it('sets the selected value', () => {
    render(<Select label="Choose" options={options} value="option2" />);
    const select = screen.getByLabelText('Choose') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('handles onChange events', () => {
    const handleChange = jest.fn();
    render(<Select label="Choose" options={options} onChange={handleChange} />);
    const select = screen.getByLabelText('Choose');
    
    fireEvent.change(select, { target: { value: 'option2' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Select label="Choose" options={options} disabled />);
    const select = screen.getByLabelText('Choose');
    expect(select).toBeDisabled();
  });

  it('renders as required', () => {
    render(<Select label="Choose" options={options} required />);
    const select = screen.getByLabelText(/Choose/);
    expect(select).toBeRequired();
  });

  it('displays error message', () => {
    const errorMessage = 'Please select an option';
    render(<Select label="Choose" options={options} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('applies error styling', () => {
    render(<Select label="Choose" options={options} error="Error" />);
    const select = screen.getByLabelText('Choose');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows required indicator', () => {
    render(<Select label="Choose" options={options} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Select label="Choose" options={options} className="custom-select" />);
    const select = screen.getByLabelText('Choose');
    expect(select).toHaveClass('custom-select');
  });

  it('displays helper text when provided', () => {
    render(<Select label="Choose" options={options} helperText="Select one option" />);
    expect(screen.getByText('Select one option')).toBeInTheDocument();
  });

  it('hides helper text when error is present', () => {
    render(
      <Select 
        label="Choose" 
        options={options}
        helperText="Select one option" 
        error="This field is required"
      />
    );
    expect(screen.queryByText('Select one option')).not.toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('sets aria-describedby with helper text id when helper text is provided', () => {
    render(<Select label="Choose" options={options} helperText="Helper text" />);
    const select = screen.getByLabelText('Choose');
    expect(select).toHaveAttribute('aria-describedby', expect.stringContaining('helper'));
  });

  it('sets aria-describedby with error id when error is provided', () => {
    render(<Select label="Choose" options={options} error="Error message" />);
    const select = screen.getByLabelText('Choose');
    expect(select).toHaveAttribute('aria-describedby', expect.stringContaining('error'));
  });
});
