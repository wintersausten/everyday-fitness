import type { Meta, StoryObj } from '@storybook/react-vite'
import { action } from 'storybook/actions'
import { Input } from '../components/ui/Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'date', 'search'],
    },
    disabled: {
      control: 'boolean',
    },
    required: {
      control: 'boolean',
    },
    onChange: { action: 'changed' },
    onFocus: { action: 'focused' },
    onBlur: { action: 'blurred' },
  },
  args: {
    onChange: action('changed'),
    onFocus: action('focused'),
    onBlur: action('blurred'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'user@example.com',
    helperText: 'We will never share your email with anyone else.',
  },
}

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    error: 'Password must be at least 8 characters long',
  },
}

export const Number: Story = {
  args: {
    label: 'Weight (kg)',
    type: 'number',
    placeholder: '0.0',
    step: '0.1',
    min: '0',
    max: '300',
  },
}

export const Date: Story = {
  args: {
    label: 'Date',
    type: 'date',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Field',
    placeholder: 'Cannot type here',
    disabled: true,
  },
}

export const Required: Story = {
  args: {
    label: 'Required Field',
    placeholder: 'This field is required',
    required: true,
  },
}

export const AllTypes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        label="Text Input"
        type="text"
        placeholder="Enter text"
        onChange={action('text changed')}
      />
      <Input
        label="Email Input"
        type="email"
        placeholder="user@example.com"
        onChange={action('email changed')}
      />
      <Input
        label="Password Input"
        type="password"
        placeholder="Enter password"
        onChange={action('password changed')}
      />
      <Input
        label="Number Input"
        type="number"
        placeholder="0"
        step="0.1"
        onChange={action('number changed')}
      />
      <Input
        label="Date Input"
        type="date"
        onChange={action('date changed')}
      />
      <Input
        label="Search Input"
        type="search"
        placeholder="Search..."
        onChange={action('search changed')}
      />
    </div>
  ),
}

export const FormValidation: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        label="Valid Input"
        placeholder="This is valid"
        helperText="Everything looks good!"
        onChange={action('valid changed')}
      />
      <Input
        label="Invalid Input"
        placeholder="This has an error"
        error="This field is required"
        onChange={action('invalid changed')}
      />
      <Input
        label="Disabled Input"
        placeholder="Cannot edit"
        disabled
        onChange={action('disabled changed')}
      />
    </div>
  ),
}

export const WeightEntry: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input
        label="Weight (kg)"
        type="number"
        placeholder="70.5"
        step="0.1"
        min="0"
        max="300"
        helperText="Enter your weight in kilograms"
        onChange={action('weight changed')}
      />
      <Input
        label="Date"
        type="date"
        onChange={action('date changed')}
      />
    </div>
  ),
}