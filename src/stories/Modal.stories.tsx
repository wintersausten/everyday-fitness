import type { Meta, StoryObj } from '@storybook/react-vite'
import { action } from 'storybook/actions'
import { useState } from 'react'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    onClose: { action: 'closed' },
  },
  args: {
    onClose: action('closed'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    children: (
      <div>
        <p className="mb-4">This is a basic modal with some content.</p>
        <Button onClick={action('action clicked')}>Action</Button>
      </div>
    ),
  },
}

export const WithTitle: Story = {
  args: {
    isOpen: true,
    title: 'Modal Title',
    children: (
      <div>
        <p className="mb-4">This modal has a title in the header.</p>
        <Button onClick={action('action clicked')}>Action</Button>
      </div>
    ),
  },
}

export const SmallSize: Story = {
  args: {
    isOpen: true,
    title: 'Small Modal',
    size: 'sm',
    children: (
      <div>
        <p className="mb-4">This is a small modal.</p>
        <Button size="sm" onClick={action('action clicked')}>OK</Button>
      </div>
    ),
  },
}

export const MediumSize: Story = {
  args: {
    isOpen: true,
    title: 'Medium Modal',
    size: 'md',
    children: (
      <div>
        <p className="mb-4">This is a medium modal with more content space.</p>
        <div className="space-x-2">
          <Button onClick={action('confirm clicked')}>Confirm</Button>
          <Button variant="secondary" onClick={action('cancel clicked')}>Cancel</Button>
        </div>
      </div>
    ),
  },
}

export const LargeSize: Story = {
  args: {
    isOpen: true,
    title: 'Large Modal',
    size: 'lg',
    children: (
      <div>
        <p className="mb-4">This is a large modal with plenty of space for content.</p>
        <p className="mb-4">You can put forms, tables, or other complex content here.</p>
        <div className="space-x-2">
          <Button onClick={action('save clicked')}>Save</Button>
          <Button variant="secondary" onClick={action('cancel clicked')}>Cancel</Button>
        </div>
      </div>
    ),
  },
}

export const LongContent: Story = {
  args: {
    isOpen: true,
    title: 'Modal with Long Content',
    children: (
      <div>
        <p className="mb-4">This modal demonstrates how it handles longer content.</p>
        <p className="mb-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor 
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud 
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
        <p className="mb-4">
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu 
          fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in 
          culpa qui officia deserunt mollit anim id est laborum.
        </p>
        <p className="mb-4">
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque 
          laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
          architecto beatae vitae dicta sunt explicabo.
        </p>
        <div className="space-x-2">
          <Button onClick={action('accept clicked')}>Accept</Button>
          <Button variant="secondary" onClick={action('decline clicked')}>Decline</Button>
        </div>
      </div>
    ),
  },
}

export const Interactive: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    
    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Interactive Modal"
          size="md"
        >
          <div>
            <p className="mb-4">
              This modal can be opened and closed interactively. 
              Try clicking the backdrop or pressing the Escape key to close it.
            </p>
            <div className="space-x-2">
              <Button onClick={() => {
                action('action performed')()
                setIsOpen(false)
              }}>
                Perform Action
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setIsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  },
}

export const AllSizes: Story = {
  render: () => {
    const [openModal, setOpenModal] = useState<string | null>(null)
    
    return (
      <div className="space-x-2">
        <Button onClick={() => setOpenModal('sm')}>Small Modal</Button>
        <Button onClick={() => setOpenModal('md')}>Medium Modal</Button>
        <Button onClick={() => setOpenModal('lg')}>Large Modal</Button>
        
        <Modal
          isOpen={openModal === 'sm'}
          onClose={() => setOpenModal(null)}
          title="Small Modal"
          size="sm"
        >
          <div>
            <p className="mb-4">This is a small modal.</p>
            <Button size="sm" onClick={() => setOpenModal(null)}>Close</Button>
          </div>
        </Modal>
        
        <Modal
          isOpen={openModal === 'md'}
          onClose={() => setOpenModal(null)}
          title="Medium Modal"
          size="md"
        >
          <div>
            <p className="mb-4">This is a medium modal.</p>
            <Button onClick={() => setOpenModal(null)}>Close</Button>
          </div>
        </Modal>
        
        <Modal
          isOpen={openModal === 'lg'}
          onClose={() => setOpenModal(null)}
          title="Large Modal"
          size="lg"
        >
          <div>
            <p className="mb-4">This is a large modal.</p>
            <Button onClick={() => setOpenModal(null)}>Close</Button>
          </div>
        </Modal>
      </div>
    )
  },
}