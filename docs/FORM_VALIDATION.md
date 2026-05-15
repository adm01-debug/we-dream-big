import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { quoteSchema } from '@/lib/validations';
// Apply in QuoteBuilderPage: const form = useForm({ resolver: zodResolver(quoteSchema) });
