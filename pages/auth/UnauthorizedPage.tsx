import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { ShieldAlert } from 'lucide-react';
import Card from '../../components/ui/Card';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-dark-background p-4">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <div className="p-8">
          <ShieldAlert size={64} className="mx-auto text-red-500 mb-6" />
          <h1 className="text-3xl font-bold text-foreground dark:text-dark-foreground mb-3">Access Denied</h1>
          <p className="text-md text-foreground/80 dark:text-dark-foreground/80 mb-8">
            You do not have the necessary permissions to access this page or resource. 
            Please contact your administrator if you believe this is an error.
          </p>
          <Link to="/">
            <Button variant="primary" size="lg">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};


export default UnauthorizedPage;
