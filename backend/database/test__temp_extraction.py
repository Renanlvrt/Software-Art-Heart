import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def plot_temperature_data(db_file):
    # 1. Connect to the database
    conn = sqlite3.connect(db_file)
    
    # 2. Extract data using SQL
    # We select 'Time' and 'Temp' from the 'sensor_data' table shown in your image
    query = "SELECT Time, Temp FROM sensor_data ORDER BY Time"
    df = pd.read_sql_query(query, conn)
    
    # Close the connection
    conn.close()

    # 3. Clean the data
    # Ensure the 'Time' column is treated as a proper datetime object, not just text
    df['Time'] = pd.to_datetime(df['Time'])

    # 4. Create the Visualization
    plt.figure(figsize=(12, 6))
    
    # Use Seaborn for a nice looking line chart
    sns.lineplot(data=df, x='Time', y='Temp', color='crimson', linewidth=2)
    
    # Formatting the graph
    plt.title('Sensor Temperature Over Time', fontsize=16)
    plt.xlabel('Time', fontsize=12)
    plt.ylabel('Temperature', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Rotate date labels slightly so they don't overlap
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Show the plot
    plt.show()

# --- Usage ---
plot_temperature_data('demoTable.db')