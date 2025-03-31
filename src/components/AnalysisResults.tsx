import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { AiNotationData } from '@/lib/services/aiPdfProcessor';

interface AnalysisResultsProps {
  analysisData: AiNotationData | null;
}

const AnalysisResults = ({ analysisData }: AnalysisResultsProps) => {
    const [results, setResults] = useState<AiNotationData | null>(null);

    useEffect(() => {
        if (analysisData) {
            setResults(analysisData);
        } else {
            toast.error("No analysis data available.");
        }
    }, [analysisData]);

    return (
        <div>
            {results ? (
                <div>
                    {/* Render the analysis results here */}
                    <h2>Analysis Results</h2>
                    <pre>{JSON.stringify(results, null, 2)}</pre>
                </div>
            ) : (
                <p>Loading results...</p>
            )}
        </div>
    );
};

export default AnalysisResults; 