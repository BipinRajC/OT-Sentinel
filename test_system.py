#!/usr/bin/env python3
"""
Test Script for ICS Security Monitoring System
Tests the Gemini API integration and Modbus connectivity
"""

import os
import asyncio
import aiohttp
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_gemini_api():
    """Test Gemini API integration."""
    print("🤖 Testing Gemini AI Integration...")
    
    api_key = os.getenv('GOOGLE_GEMINI_API_KEY')
    if not api_key:
        print("❌ No Gemini API key found in environment")
        return False
    
    try:
        # Test backend AI endpoint
        async with aiohttp.ClientSession() as session:
            payload = {
                "message": "What are the main security considerations for Modbus protocol?"
            }
            
            async with session.post(
                'http://localhost:8000/api/ai/chat',
                json=payload,
                timeout=30
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    print("✅ Gemini AI API working!")
                    print(f"📝 Response preview: {data['response'][:100]}...")
                    return True
                else:
                    print(f"❌ Backend AI API failed: {response.status}")
                    error_text = await response.text()
                    print(f"   Error: {error_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Error testing Gemini API: {e}")
        return False

async def test_modbus_connection():
    """Test Modbus connection."""
    print("\n🔌 Testing Modbus Connection...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test Modbus status
            async with session.get('http://localhost:8000/api/modbus/status') as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ Modbus service running!")
                    print(f"📊 Connection status: {data.get('is_connected', 'Unknown')}")
                    print(f"🏠 Target: {data.get('host', 'Unknown')}:{data.get('port', 'Unknown')}")
                    
                    # Test data endpoint
                    async with session.get('http://localhost:8000/api/modbus/data') as data_response:
                        if data_response.status == 200:
                            modbus_data = await data_response.json()
                            print("✅ Modbus data available!")
                            print(f"📈 Data points: {len(modbus_data.get('data', {}))}")
                        else:
                            print("⚠️  Modbus data not available (device may be offline)")
                    
                    return True
                else:
                    print(f"❌ Modbus status check failed: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"❌ Error testing Modbus: {e}")
        return False

async def test_websocket():
    """Test WebSocket connection."""
    print("\n📡 Testing WebSocket Connection...")
    
    try:
        import websockets
        
        async with websockets.connect('ws://localhost:8000/ws') as websocket:
            # Wait for initial message
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            
            print("✅ WebSocket connected!")
            print(f"📨 Initial message type: {data.get('type', 'Unknown')}")
            
            return True
            
    except asyncio.TimeoutError:
        print("⚠️  WebSocket connected but no initial message received")
        return True
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False

async def test_health_endpoint():
    """Test system health endpoint."""
    print("\n❤️  Testing System Health...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get('http://localhost:8000/api/health') as response:
                if response.status == 200:
                    data = await response.json()
                    print("✅ System health check passed!")
                    print(f"🔧 Status: {data.get('status', 'Unknown')}")
                    print(f"🤖 AI Key configured: {data.get('environment', {}).get('has_gemini_key', False)}")
                    print(f"🔌 Active WebSockets: {data.get('active_websockets', 0)}")
                    
                    modbus_status = data.get('modbus_status', {})
                    print(f"📡 Modbus connected: {modbus_status.get('is_connected', False)}")
                    
                    return True
                else:
                    print(f"❌ Health check failed: {response.status}")
                    return False
                    
    except Exception as e:
        print(f"❌ Error checking system health: {e}")
        return False

async def main():
    """Run all tests."""
    print("🔬 ICS Security Monitoring System - Test Suite")
    print("=" * 55)
    
    # Test results
    results = []
    
    # Run tests
    results.append(await test_health_endpoint())
    results.append(await test_gemini_api())
    results.append(await test_modbus_connection())
    results.append(await test_websocket())
    
    # Summary
    print("\n" + "=" * 55)
    print("📊 Test Summary")
    print("=" * 55)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print("\n🎉 All tests passed! System is ready to use.")
        print("\n🚀 You can now:")
        print("   - Open http://localhost:3000 for the web interface")
        print("   - Use the AI Assistant for ICS security guidance")
        print("   - Monitor real-time Modbus data from 192.168.95.2:502")
        print("   - View system health at http://localhost:8000/api/health")
    else:
        print("\n⚠️  Some tests failed. Please check the system configuration.")
        print("   - Make sure Redis is running")
        print("   - Check the .env file has correct API key")
        print("   - Verify Modbus device is accessible at 192.168.95.2:502")
    
    print("=" * 55)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}") 