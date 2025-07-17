import type { Meta, StoryObj } from '@storybook/react-vite'
import { action } from 'storybook/actions'
import { Button } from '../components/ui/Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
  args: {
    onClick: action('clicked'),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Delete',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Cancel',
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
}

export const Medium: Story = {
  args: {
    size: 'md',
    children: 'Medium Button',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
}

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-x-2">
        <Button variant="primary" onClick={action('primary clicked')}>Primary</Button>
        <Button variant="secondary" onClick={action('secondary clicked')}>Secondary</Button>
        <Button variant="danger" onClick={action('danger clicked')}>Danger</Button>
        <Button variant="ghost" onClick={action('ghost clicked')}>Ghost</Button>
      </div>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button size="sm" onClick={action('small clicked')}>Small</Button>
        <Button size="md" onClick={action('medium clicked')}>Medium</Button>
        <Button size="lg" onClick={action('large clicked')}>Large</Button>
      </div>
    </div>
  ),
}

export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-x-2">
        <Button onClick={action('normal clicked')}>Normal</Button>
        <Button loading onClick={action('loading clicked')}>Loading</Button>
        <Button disabled onClick={action('disabled clicked')}>Disabled</Button>
      </div>
    </div>
  ),
}