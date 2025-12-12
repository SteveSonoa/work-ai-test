import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Table } from '@/components/ui/Table';

describe('Table Component', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
  ];

  const data = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
  ];

  it('renders table headers', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('renders table data', () => {
    render(<Table columns={columns} data={data} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders correct number of rows', () => {
    const { container } = render(<Table columns={columns} data={data} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('renders empty state message when no data', () => {
    render(<Table columns={columns} data={[]} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('has proper table structure', () => {
    const { container } = render(<Table columns={columns} data={data} />);
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
  });

  it('renders JSX content in cells', () => {
    const dataWithJSX = [
      {
        id: '1',
        name: 'John',
        email: 'john@example.com',
        role: <span className="badge">Admin</span>,
      },
    ];
    render(<Table columns={columns} data={dataWithJSX} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin').closest('span')).toHaveClass('badge');
  });

  it('applies custom className', () => {
    const { container } = render(
      <Table columns={columns} data={data} className="custom-table" />
    );
    expect(container.querySelector('.custom-table')).toBeInTheDocument();
  });

  it('uses custom render function when provided', () => {
    const customColumns = [
      {
        key: 'name',
        label: 'Name',
        render: (value: unknown) => <strong>{value as string}</strong>,
      },
      { key: 'email', label: 'Email' },
    ];

    render(<Table columns={customColumns} data={data} />);
    const nameCell = screen.getByText('John Doe');
    expect(nameCell.tagName).toBe('STRONG');
  });

  it('uses custom keyExtractor when provided', () => {
    const customKeyExtractor = jest.fn((row: Record<string, unknown>) => `custom-${row.email}`);
    const { container } = render(
      <Table columns={columns} data={data} keyExtractor={customKeyExtractor} />
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(customKeyExtractor).toHaveBeenCalledTimes(2);
    expect(customKeyExtractor).toHaveBeenCalledWith(data[0], 0);
  });

  it('falls back to index when row has no id', () => {
    const dataWithoutIds = [
      { name: 'John', email: 'john@example.com', role: 'Admin' },
      { name: 'Jane', email: 'jane@example.com', role: 'User' },
    ];
    const { container } = render(<Table columns={columns} data={dataWithoutIds} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('uses custom emptyMessage when provided', () => {
    render(<Table columns={columns} data={[]} emptyMessage="No users found" />);
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('sets custom aria-label when provided', () => {
    const { container } = render(
      <Table columns={columns} data={data} aria-label="Users table" />
    );
    const table = container.querySelector('table');
    expect(table).toHaveAttribute('aria-label', 'Users table');
  });
});
