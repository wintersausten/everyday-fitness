import type { Meta, StoryObj } from '@storybook/react-vite'
import { action } from 'storybook/actions'
import { useState } from 'react'
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof DeleteConfirmationModal> = {
  title: 'UI/DeleteConfirmationModal',
  component: DeleteConfirmationModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    itemName: {
      control: 'text',
    },
    onClose: { action: 'closed' },
    onConfirm: { action: 'confirmed' },
  },
  args: {
    onClose: action('closed'),
    onConfirm: action('confirmed'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
    loading: false,
  },
}

export const WithItemName: Story = {
  args: {
    isOpen: true,
    title: 'Delete Weight Entry',
    description: 'Are you sure you want to delete the weight entry for',
    itemName: 'January 15, 2024 (70.5 kg)',
    loading: false,
  },
}

export const Loading: Story = {
  args: {
    isOpen: true,
    title: 'Delete Weight Entry',
    description: 'Are you sure you want to delete this weight entry?',
    loading: true,
  },
}

export const LongDescription: Story = {
  args: {
    isOpen: true,
    title: 'Delete All Data',
    description: 'This will permanently delete all of your weight entries, settings, and associated data from the application',
    loading: false,
  },
}

export const LongItemName: Story = {
  args: {
    isOpen: true,
    title: 'Delete Weight Entry',
    description: 'Are you sure you want to delete the weight entry for',
    itemName: 'January 15, 2024 (70.5 kg) - This was your heaviest recorded weight',
    loading: false,
  },
}

export const WeightEntry: Story = {
  args: {
    isOpen: true,
    title: 'Delete Weight Entry',
    description: 'Are you sure you want to delete the weight entry for',
    itemName: 'January 15, 2024 (70.5 kg)',
    loading: false,
  },
}

export const Settings: Story = {
  args: {
    isOpen: true,
    title: 'Reset Settings',
    description: 'Are you sure you want to reset all settings to their default values?',
    loading: false,
  },
}

export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    
    const handleConfirm = () => {
      setLoading(true)
      action('confirm clicked')()
      
      // Simulate API call
      setTimeout(() => {
        setLoading(false)
        setIsOpen(false)
        action('deletion completed')()
      }, 2000)
    }
    
    return (
      <div>
        <Button 
          variant="danger" 
          onClick={() => setIsOpen(true)}
        >
          Delete Item
        </Button>
        
        <DeleteConfirmationModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title="Delete Weight Entry"
          description="Are you sure you want to delete the weight entry for"
          itemName="January 15, 2024 (70.5 kg)"
          loading={loading}
        />
      </div>
    )
  },
}

export const MultipleScenarios: Story = {
  render: () => {
    const [activeModal, setActiveModal] = useState<string | null>(null)
    
    return (
      <div className="space-x-2">
        <Button 
          variant="danger" 
          onClick={() => setActiveModal('entry')}
        >
          Delete Entry
        </Button>
        
        <Button 
          variant="danger" 
          onClick={() => setActiveModal('settings')}
        >
          Reset Settings
        </Button>
        
        <Button 
          variant="danger" 
          onClick={() => setActiveModal('all')}
        >
          Delete All Data
        </Button>
        
        <DeleteConfirmationModal
          isOpen={activeModal === 'entry'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => {
            action('entry deleted')()
            setActiveModal(null)
          }}
          title="Delete Weight Entry"
          description="Are you sure you want to delete the weight entry for"
          itemName="January 15, 2024 (70.5 kg)"
          loading={false}
        />
        
        <DeleteConfirmationModal
          isOpen={activeModal === 'settings'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => {
            action('settings reset')()
            setActiveModal(null)
          }}
          title="Reset Settings"
          description="Are you sure you want to reset all settings to their default values?"
          loading={false}
        />
        
        <DeleteConfirmationModal
          isOpen={activeModal === 'all'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => {
            action('all data deleted')()
            setActiveModal(null)
          }}
          title="Delete All Data"
          description="This will permanently delete all of your weight entries, settings, and associated data from the application"
          loading={false}
        />
      </div>
    )
  },
}

export const LoadingStates: Story = {
  render: () => {
    const [activeModal, setActiveModal] = useState<string | null>(null)
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
    
    const handleConfirm = (modalType: string) => {
      setLoadingStates(prev => ({ ...prev, [modalType]: true }))
      action(`${modalType} confirm clicked`)()
      
      setTimeout(() => {
        setLoadingStates(prev => ({ ...prev, [modalType]: false }))
        setActiveModal(null)
        action(`${modalType} completed`)()
      }, 2000)
    }
    
    return (
      <div className="space-x-2">
        <Button 
          variant="danger" 
          onClick={() => setActiveModal('quick')}
        >
          Quick Delete
        </Button>
        
        <Button 
          variant="danger" 
          onClick={() => setActiveModal('slow')}
        >
          Slow Delete
        </Button>
        
        <DeleteConfirmationModal
          isOpen={activeModal === 'quick'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => handleConfirm('quick')}
          title="Delete Item"
          description="Are you sure you want to delete this item?"
          loading={loadingStates.quick || false}
        />
        
        <DeleteConfirmationModal
          isOpen={activeModal === 'slow'}
          onClose={() => setActiveModal(null)}
          onConfirm={() => handleConfirm('slow')}
          title="Delete Large Dataset"
          description="Are you sure you want to delete this large dataset? This may take a few moments."
          loading={loadingStates.slow || false}
        />
      </div>
    )
  },
}