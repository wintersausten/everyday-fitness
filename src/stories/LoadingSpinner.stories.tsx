import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    className: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Small: Story = {
  args: {
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
  },
}

export const CustomColor: Story = {
  args: {
    size: 'md',
    className: 'text-blue-500',
  },
}

export const CustomColorRed: Story = {
  args: {
    size: 'md',
    className: 'text-red-500',
  },
}

export const CustomColorGreen: Story = {
  args: {
    size: 'md',
    className: 'text-green-500',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center space-x-8">
      <div className="text-center">
        <LoadingSpinner size="sm" />
        <p className="mt-2 text-sm text-gray-600">Small</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" />
        <p className="mt-2 text-sm text-gray-600">Medium</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-2 text-sm text-gray-600">Large</p>
      </div>
    </div>
  ),
}

export const DifferentColors: Story = {
  render: () => (
    <div className="flex items-center space-x-8">
      <div className="text-center">
        <LoadingSpinner size="md" className="text-blue-500" />
        <p className="mt-2 text-sm text-gray-600">Blue</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-red-500" />
        <p className="mt-2 text-sm text-gray-600">Red</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-green-500" />
        <p className="mt-2 text-sm text-gray-600">Green</p>
      </div>
      <div className="text-center">
        <LoadingSpinner size="md" className="text-purple-500" />
        <p className="mt-2 text-sm text-gray-600">Purple</p>
      </div>
    </div>
  ),
}

export const InContext: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" />
          <span className="text-sm text-gray-600">Loading...</span>
        </div>
      </div>
      
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Please wait while we load your data</p>
        </div>
      </div>
      
      <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-lg">
        <LoadingSpinner size="sm" className="text-blue-600" />
        <span className="text-blue-600 font-medium">Processing...</span>
      </div>
    </div>
  ),
}

export const WithButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <button 
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        disabled
      >
        <LoadingSpinner size="sm" className="mr-2" />
        Loading...
      </button>
      
      <button 
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
        disabled
      >
        <LoadingSpinner size="sm" className="mr-2" />
        Saving...
      </button>
      
      <button 
        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
        disabled
      >
        <LoadingSpinner size="sm" className="mr-2" />
        Deleting...
      </button>
    </div>
  ),
}